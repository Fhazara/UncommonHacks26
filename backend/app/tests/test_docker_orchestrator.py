import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.services.docker_orchestrator import provision_workspace, allocate_port, release_port, _allocated_ports


@pytest.fixture(autouse=True)
def clear_ports():
    _allocated_ports.clear()
    yield
    _allocated_ports.clear()


def test_provision_workspace_none_creates_directory(tmp_path):
    experiment_id = "test-exp-001"
    with patch("app.services.docker_orchestrator.WORKSPACE_BASE", tmp_path):
        result = provision_workspace(
            experiment_id=experiment_id,
            starter_code_source="none",
        )
    workspace = Path(result)
    assert workspace.exists()
    assert workspace.is_dir()
    assert experiment_id in result


def test_allocate_port_returns_unique_ports():
    p1 = allocate_port()
    p2 = allocate_port()
    assert p1 != p2
    assert 9000 <= p1 <= 9099
    assert 9000 <= p2 <= 9099


def test_release_port_frees_allocation():
    port = allocate_port()
    release_port(port)
    # Should be allocatable again
    next_port = allocate_port()
    assert next_port == port
