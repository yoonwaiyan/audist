import type { TemplateVars } from './engine'

/**
 * A realistic ~500 word mock meeting transcript used to preview a template's
 * output when no real session is available (e.g. previewing from the
 * template editor before ever recording a session).
 */
export const SAMPLE_TRANSCRIPT = `[00:00:02] Alex: Morning everyone, thanks for hopping on. Let's do a quick sync on the Q3 launch.
[00:00:11] Priya: Sounds good. From the design side, the onboarding flow mockups are done and in the shared Figma file. I sent the link in Slack yesterday.
[00:00:24] Alex: Great, I saw that. Jordan, did engineering get a chance to review it?
[00:00:31] Jordan: Yeah, we went through it yesterday afternoon. Overall it looks solid. There's one screen — the permissions step — where we might need a fallback state if the user denies microphone access on the first try.
[00:00:47] Priya: Good catch, I hadn't accounted for that. I can add a fallback variant by Thursday.
[00:00:55] Alex: Perfect. Let's make that an action item — Priya to add the fallback state mockup by Thursday.
[00:01:05] Jordan: On the engineering side, we're about 70% done with the recording pipeline. The mic capture and system audio mixing are both working locally. The blocker right now is the whisper.cpp integration on Windows — the binary path resolution is different from macOS and it's failing silently.
[00:01:28] Alex: How big of a blocker is that? Does it put the launch date at risk?
[00:01:34] Jordan: If we can't crack it by end of week, yes, we'd probably need to push a few days. I want to give it two more days before raising the alarm.
[00:01:45] Alex: Okay, let's set a checkpoint. If it's not resolved by Wednesday EOD, we escalate and talk about the timeline. Sam, can you help Jordan look at the Windows path issue since you did the Linux build?
[00:02:02] Sam: Sure, happy to pair on that this afternoon.
[00:02:07] Alex: Great, thank you. Let's call that a decision — Wednesday EOD checkpoint on the Windows binary issue, Sam pairs with Jordan today.
[00:02:18] Priya: One more thing — marketing asked if we could get three screenshots for the App Store listing by next Monday. Is that realistic given the fallback state work?
[00:02:30] Jordan: The screenshots don't need the fallback state finished, so that should be fine on the engineering side.
[00:02:37] Priya: Okay, I'll plan to have screenshots ready by Monday then.
[00:02:43] Alex: Awesome. Let's also flag an open question — we still haven't decided whether the free tier includes summarisation or if that's a paid-only feature. Sam, do you have context from the pricing discussion last week?
[00:03:02] Sam: I know finance was leaning toward gating summarisation behind the paid tier, but nothing's been finalized. I think we need Priya's input on how that affects the onboarding flow messaging.
[00:03:15] Priya: Yeah, if summarisation is paid-only, the onboarding copy needs to change to set expectations. Can we get a decision from finance by end of week?
[00:03:26] Alex: I'll follow up with finance today and get an answer by Friday. Let's mark that as an open question for now — pricing tier for summarisation, owner: Alex, needed by Friday.
[00:03:40] Jordan: Sounds good. I think that covers everything from my side.
[00:03:45] Sam: Same here, I'll block time this afternoon for the Windows pairing session.
[00:03:50] Priya: I'll get started on the fallback mockup and screenshots today.
[00:03:56] Alex: Perfect, thanks everyone. Let's reconvene Wednesday for the checkpoint. Have a good rest of your day.
[00:04:05] Jordan: Sounds good, talk then.
[00:04:07] Sam: Bye all.
[00:04:08] Priya: Bye!`

/** Vars used when previewing a template without a real session (built-in sample transcript). */
export function getSampleTranscriptVars(): TemplateVars {
  return {
    transcript: SAMPLE_TRANSCRIPT,
    date: new Date().toISOString().split('T')[0],
    duration: '4 min',
    participants: 'Alex, Priya, Jordan, Sam',
    meeting_title: 'Q3 Launch Sync'
  }
}
