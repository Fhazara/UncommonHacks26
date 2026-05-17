import docker
import shutil
import subprocess
from pathlib import Path
from typing import Optional

WORKSPACE_BASE = Path("/tmp/hci-experiments")
PORT_POOL = list(range(9000, 9100))
_allocated_ports: set[int] = set()

_docker_client = None


def _client() -> docker.DockerClient:
    global _docker_client
    if _docker_client is None:
        _docker_client = docker.from_env()
    return _docker_client


def allocate_port() -> int:
    for p in PORT_POOL:
        if p not in _allocated_ports:
            _allocated_ports.add(p)
            return p
    raise RuntimeError("No available ports in pool")


def release_port(port: int) -> None:
    _allocated_ports.discard(port)


def provision_workspace(
    experiment_id: str,
    starter_code_source: str,
    github_url: Optional[str] = None,
    github_token: Optional[str] = None,
    upload_path: Optional[str] = None,
) -> str:
    workspace = WORKSPACE_BASE / experiment_id
    workspace.mkdir(parents=True, exist_ok=True)

    if starter_code_source == "github" and github_url:
        clone_url = github_url
        if github_token:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(github_url)
            clone_url = urlunparse(parsed._replace(
                netloc=f"{github_token}@{parsed.netloc}"
            ))
        subprocess.run(
            ["git", "clone", "--depth=1", clone_url, str(workspace)],
            check=True, capture_output=True, text=True,
        )
    elif starter_code_source == "upload" and upload_path:
        shutil.unpack_archive(upload_path, str(workspace))

    return str(workspace)


def launch_container(experiment_id: str, workspace_path: str, port: int) -> str:
    # DEMO STUB: return mock container ID without launching Docker
    return f"mock-{experiment_id[:12]}"

def _launch_container_real(experiment_id: str, workspace_path: str, port: int) -> str:
    container = _client().containers.run(
        image="hci-sandbox:latest",
        name=f"hci-{experiment_id[:12]}",
        detach=True,
        ports={"8080/tcp": port},
        volumes={
            workspace_path: {
                "bind": "/config/workspace",
                "mode": "rw",
            }
        },
        environment={"EXPERIMENT_ID": experiment_id},
        mem_limit="2g",
        cpu_quota=100000,
        cpu_period=100000,
        network_mode="bridge",
        security_opt=["no-new-privileges:true"],
        cap_drop=["ALL"],
        cap_add=["CHOWN", "SETGID", "SETUID", "NET_BIND_SERVICE"],
        read_only=False,
        remove=False,
        extra_hosts={"host.docker.internal": "host-gateway"},
    )
    return container.id


def stop_container(container_id: str, workspace_path: str, port: int) -> None:
    if not container_id.startswith("mock-"):
        try:
            container = _client().containers.get(container_id)
            container.stop(timeout=15)
            container.remove(force=True)
        except docker.errors.NotFound:
            pass
        except Exception as e:
            print(f"Container stop error: {e}")

    release_port(port)

    try:
        shutil.rmtree(workspace_path, ignore_errors=True)
    except Exception:
        pass


def container_is_running(container_id: str) -> bool:
    if container_id.startswith("mock-"):
        return True
    try:
        container = _client().containers.get(container_id)
        return container.status == "running"
    except docker.errors.NotFound:
        return False
