"""
Pure unit test for the route optimizer's accepted-match validation - no
database, no OR-Tools solve. Full optimize_route() integration coverage
(real PostGIS distance matrix + a real CVRP solve) is not tested here; this
repo has no DB test fixture infrastructure yet (see test_matching_service.py's
note on the same gap), so this only covers the pure logic that decides
whether a caller's requested waste_record_ids are all legitimately ACCEPTED
for the target facility.
"""
import uuid

from app.services.route_service import _missing_accepted_ids


def test_no_missing_when_every_requested_id_is_accepted():
    ids = {uuid.uuid4(), uuid.uuid4()}
    assert _missing_accepted_ids(ids, ids) == set()


def test_flags_requested_ids_that_are_not_accepted():
    accepted = uuid.uuid4()
    not_accepted = uuid.uuid4()
    requested = {accepted, not_accepted}
    assert _missing_accepted_ids(requested, {accepted}) == {not_accepted}


def test_empty_requested_set_has_nothing_missing():
    assert _missing_accepted_ids(set(), {uuid.uuid4()}) == set()
