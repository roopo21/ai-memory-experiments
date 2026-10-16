"""The test corpus: a 10-month timeline with planted temporal and graph structure.

Deliberately modelled on the operator's real world (a voice-AI product plus
endurance training) so the scores mean something for daily use rather than for a
synthetic benchmark.

Planted structure
-----------------
supersession      E01 -> E03      Deepgram replaced by AssemblyAI
role change       E02 -> E06      Pavan replaced by Shreya as backend lead
partial update    E01 -> E05      LiveKit demoted to transport only, not removed
temporary fact    E07 -> E08      training volume dips, then reverts
multi-hop join    E06  +  E10     "who built the fallback" needs two memories
cold negative     (none)          nothing was ever said about a CRM
"""

from dataclasses import dataclass, field

TODAY = "2026-10-16"


@dataclass(frozen=True)
class Event:
    id: str
    date: str  # YYYY-MM-DD, the day the statement was made
    text: str
    expires: str | None = None  # only set where the fact is self-limiting


# --- the timeline, in chronological order ----------------------------------
TIMELINE: list[Event] = [
    Event(
        "E01", "2026-01-10",
        "Kicking off Orca, a voice AI agent for field sales teams. The stack is "
        "LiveKit for transport, Deepgram for speech-to-text, and Cartesia for TTS.",
    ),
    Event(
        "E02", "2026-02-02",
        "All Orca data lives in Supabase Postgres. Pavan is leading backend engineering.",
    ),
    Event(
        "E03", "2026-03-15",
        "We swapped Orca's speech-to-text from Deepgram to AssemblyAI. Deepgram's word "
        "error rate on Indian English accents was unacceptable for our field reps.",
    ),
    Event(
        "E04", "2026-04-20",
        "I'm training for Ironman 70.3 Goa in November. Base phase right now, about 12 "
        "hours a week. My coach is Nikhil.",
    ),
    Event(
        "E05", "2026-05-30",
        "Moved Orca's agent orchestration off LiveKit Agents and onto Pipecat. We still "
        "use LiveKit, but purely as the WebRTC transport layer now.",
    ),
    Event(
        "E06", "2026-06-18",
        "Pavan has left Orca. Shreya has taken over as backend lead.",
    ),
    Event(
        "E07", "2026-07-07",
        "Cutting triathlon training down to 6 hours a week until the end of August. The "
        "fundraise is eating everything.",
        expires="2026-08-31",
    ),
    Event(
        "E08", "2026-08-25",
        "Seed round is closed. Going back to 12 hours a week of triathlon training from "
        "September.",
    ),
    Event(
        "E09", "2026-09-12",
        "Standardising on Claude Opus for all codegen and agent work at Orca. We're "
        "dropping the GPT-4 class models from the stack.",
    ),
    Event(
        "E10", "2026-10-05",
        "Orca's ASR is now AssemblyAI with a Whisper fallback for offline mode. Shreya "
        "built the fallback.",
    ),
]


@dataclass(frozen=True)
class Probe:
    id: str
    kind: str
    query: str
    # AND over groups; each group is OR over regexes. All groups must be hit.
    expect: list[list[str]] = field(default_factory=list)
    # facts that were true once and are not any more. Retrieving these alongside
    # the right answer is what poisons an agent's context.
    stale: list[str] = field(default_factory=list)
    reference_date: str | None = None
    note: str = ""


PROBES: list[Probe] = [
    Probe(
        "P1", "supersession",
        "What speech-to-text provider does Orca use?",
        expect=[[r"assembly\s*ai"]],
        stale=[r"deepgram"],
        note="Deepgram was replaced in March. Co-retrieving it is the classic failure.",
    ),
    Probe(
        "P2", "role-change",
        "Who leads backend engineering on Orca?",
        expect=[[r"shreya"]],
        stale=[r"pavan"],
        note="Entity-attribute overwrite: the role moved from one person to another.",
    ),
    Probe(
        "P3", "partial-update",
        "What do we use LiveKit for on Orca?",
        expect=[[r"webrtc", r"transport"]],
        stale=[],
        note="LiveKit was narrowed, not dropped. Tests over-eager overwriting.",
    ),
    Probe(
        "P4", "multi-hop",
        "Who built Orca's offline ASR fallback, and what does it use?",
        expect=[[r"shreya"], [r"whisper"]],
        note="Needs E10 joined to the entity. Pure vector search often gets one half.",
    ),
    Probe(
        "P5", "entity-chain",
        "Who is my triathlon coach and what race am I training for?",
        expect=[[r"nikhil"], [r"70\.?3|goa|ironman"]],
        note="Two attributes hanging off one entity in a single memory.",
    ),
    Probe(
        "P6", "point-in-time",
        "How many hours a week was I training in July 2026?",
        expect=[[r"\b6\b|six"]],
        stale=[r"\b12\b|twelve"],
        reference_date="2026-07-20T00:00:00Z",
        note="Bi-temporal: the answer is the fact that was true THEN, not now.",
    ),
    Probe(
        "P7", "current-after-revert",
        "How many hours a week am I training now?",
        expect=[[r"\b12\b|twelve"]],
        stale=[r"\b6\b|six"],
        note="The dip expired and reverted. Tests whether expiry actually works.",
    ),
    Probe(
        "P8", "preference",
        "Which LLM should I use for codegen?",
        expect=[[r"claude|opus"]],
        stale=[r"gpt"],
        note="Stated preference with an explicit negative ('dropping GPT').",
    ),
    Probe(
        "P9", "cold-negative",
        "Which CRM does Orca integrate with?",
        expect=[],
        note="Never stated. Anything returned confidently here is noise.",
    ),
    Probe(
        "P10", "cross-domain-precision",
        "What is my current training volume?",
        expect=[[r"\b12\b|twelve"]],
        stale=[r"deepgram|assembly|pipecat|supabase|livekit"],
        note="Should not drag the engineering stack into a fitness question.",
    ),
]
