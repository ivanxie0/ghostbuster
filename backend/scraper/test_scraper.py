"""Offline tests for the scraper (network mocked). Run: make test"""
import pytest

from scraper import cache, ghosts, providers, web

NPI_REC = {
    "number": 1234567890,
    "basic": {"first_name": "JANE", "last_name": "DOE", "credential": "L.M.F.T.", "status": "A"},
    "addresses": [
        {"address_purpose": "MAILING", "address_1": "PO BOX 1", "city": "X", "state": "CA", "postal_code": "92122"},
        {"address_purpose": "LOCATION", "address_1": "123 MAIN ST", "city": "SAN DIEGO", "state": "CA",
         "postal_code": "921221234", "telephone_number": "858-555-0199"},
    ],
    "taxonomies": [{"code": "106H00000X", "primary": True}],
}
NPI_WRONG_TAX = {**NPI_REC, "number": 2, "basic": {**NPI_REC["basic"], "last_name": "ROE"},
                 "taxonomies": [{"code": "207Q00000X", "primary": True}]}


@pytest.fixture
def live(monkeypatch):
    monkeypatch.setattr(providers, "FAKE_MODE", False)
    monkeypatch.setattr(ghosts, "FAKE_MODE", False)
    store = {}
    monkeypatch.setattr(cache, "_enabled", lambda: True)
    monkeypatch.setattr(cache, "get", lambda k, max_age_days=7: store.get(k))
    monkeypatch.setattr(cache, "put", lambda k, s, p: store.__setitem__(k, p))
    monkeypatch.setenv("TEAMMATE_PHONE_1", "+15550000001")
    return store


def test_npi_fallback_filters_taxonomy_and_caches(live, monkeypatch):
    monkeypatch.setattr(web, "npi_search", lambda timeout, **kw: [NPI_REC, NPI_WRONG_TAX])
    out = providers.get_providers("Blue Shield of California", "92122", "therapist")
    real = [p for p in out if "npiregistry" in (p.source_url or "")]
    assert [p.name for p in real] == ["Jane Doe, LMFT"]
    assert real[0].phone == "+18585550199"
    assert real[0].address.endswith("CA 92122")
    assert any(p.phone == "+15550000001" for p in out), "demo teammate provider must be appended"
    assert "providers:blue shield of california|92122|therapist" in live
    # second call is served from cache even if NPI is down
    monkeypatch.setattr(web, "npi_search", lambda timeout, **kw: (_ for _ in ()).throw(RuntimeError("down")))
    again = providers.get_providers("Blue Shield of California", "92122", "therapist")
    assert [p.name for p in again] == [p.name for p in out]


def test_everything_down_falls_back_to_seed(live, monkeypatch):
    monkeypatch.setattr(web, "npi_search", lambda timeout, **kw: (_ for _ in ()).throw(RuntimeError("down")))
    out = providers.get_providers("Nobody Insurance", "92122", "therapist")
    assert out == providers.load_seed_providers("therapist")


def test_fake_mode_is_seed_only(monkeypatch):
    monkeypatch.setattr(providers, "FAKE_MODE", True)
    assert providers.get_providers("x", "92122", "therapist") == providers.load_seed_providers("therapist")


@pytest.mark.parametrize("text,verdict", [
    ("Dr. Doe is not currently accepting new clients.", "ghost"),
    ("My waitlist is full until spring", "ghost"),
    ("I am an out-of-network provider only", "ghost"),
    ("I do not accept insurance.", "ghost"),
    ("Currently accepting new clients! In-person and online.", "ok"),
    ("Welcome to my practice.", None),
])
def test_classify_text(text, verdict):
    assert ghosts.classify_text(text)[0] == verdict


def test_ghost_check_profile_and_seed(live, monkeypatch):
    pages = {"https://drdoe.example.org": (200, "Sorry, I'm not accepting new patients at this time."),
             "https://gone.example.org": (404, "not found")}
    monkeypatch.setattr(web, "unlock", lambda url, timeout, markdown=True: pages[url])
    monkeypatch.setattr(web, "brightdata_configured", lambda: True)
    seed = providers.load_seed_providers("therapist")
    ps = [
        providers.Provider(name="Jane Doe, LMFT", specialty="therapist", source_url="https://drdoe.example.org",
                           address="1 A St, San Diego, CA 92122"),
        providers.Provider(name="Old Gone, LCSW", specialty="therapist", source_url="https://gone.example.org"),
        providers.Provider(name="No Profile", specialty="therapist",
                           source_url="https://npiregistry.cms.hhs.gov/provider-view/1"),
    ] + seed
    out = ghosts.run_ghost_check(ps)
    assert [p.name for p in out] == [p.name for p in ps]
    assert out[0].ghost_status == "ghost" and "not accepting" in out[0].ghost_reason
    assert out[1].ghost_status == "ghost" and "404" in out[1].ghost_reason
    assert out[2].ghost_status == "unverified"
    import json
    expected = {r["name"] for r in json.loads(providers.SEED_FILE.read_text()) if r["ghost_status"] == "ghost"}
    seed_ghosts = {p.name for p in out[3:] if p.ghost_status == "ghost"}
    assert seed_ghosts == expected & {p.name for p in seed}


def test_profile_checked_note_on_available(live, monkeypatch):
    monkeypatch.setattr(web, "unlock", lambda url, timeout, markdown=True: (200, "Currently accepting new clients!"))
    monkeypatch.setattr(web, "brightdata_configured", lambda: True)
    p = providers.Provider(name="Ann Open, LMFT", specialty="therapist", source_url="https://annopen.example.org")
    out = ghosts.run_ghost_check([p])[0]
    assert out.ghost_status == "unverified"
    assert out.ghost_reason.startswith("Profile checked:") and "annopen.example.org" in out.ghost_reason


def test_excluded_domains_are_never_fetched(live, monkeypatch):
    def boom(*a, **k):
        raise AssertionError("must not fetch an excluded site")
    monkeypatch.setattr(web, "unlock", boom)
    monkeypatch.setattr(web, "brightdata_configured", lambda: True)
    p = providers.Provider(name="Pat Listed, LCSW", specialty="therapist",
                           source_url="https://www.psychologytoday.com/us/therapists/pat-listed-san-diego-ca/1")
    out = ghosts.run_ghost_check([p])[0]
    assert out.ghost_status == "unverified" and out.ghost_reason is None
