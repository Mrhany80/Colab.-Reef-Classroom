# Changelog

## 1.4.1

### Fixed
Typed text on the class whiteboard no longer runs across the dividing lines or over other areas. Text now wraps inside the area
where it was tapped, very long words are broken, and text stays below the area label. Moving a text re-fits it to its new area.

### Changed
**Class whiteboard in the teacher's view** — every activity has "Open class whiteboard" in the phase controls of the control page,
so the board opens on the same page with no new tab. It is still available on the projector view.

## 1.4.0

### New on the class whiteboard
**Text** — tap anywhere with the Text tool and type. Works inside each divided area.
**Sticky notes, highlighter, lines and arrows** — plus a plain, grid or lined background.
**Photos** — add a photo or picture from the device, move it with the Move tool, make it bigger or smaller, and write over it.
**Record audio** — record up to 90 seconds; the recording is saved with the board and plays in the teacher's view and the report.
"Read handwriting into text" now also collects the typed text of each area.

### Joining
**Join QR at any time** — "Show QR" on the projector and "Join QR" in the teacher's view open a large QR code with the code and link,
plus Copy join link, Download QR and Print. Students can join from any Wi-Fi network or mobile data; they do not need the school network.

### Session dashboard
The report is now a dashboard: five headline tiles, filters for activity, student and praise behaviour, bar charts and a participation
matrix that filter the whole page when you select a bar, a name or a column, two ring charts, and the detail tables underneath.
CSV and PDF export are unchanged. Students are always listed in roster order, never ranked.

### Fixed
"Save board and text to this activity" did nothing after "Read handwriting into text". It now saves the board, the text and any recording.

### New in answer boxes
**Add a photo** and **Record audio** (up to 60 seconds) beside "Write by hand". An answer can be text, handwriting, a photo, audio or a mix.

## 1.3.0

### New
**Divide the class whiteboard** — "Divide into" splits the smartboard into 2, 3, 4, 6 or 8 writing areas so many students write at the
same time, each in their own space. Areas are numbered, or labelled with the activity's pairs or groups ("Group 1: Omar, Sara").
The dividing lines and labels are part of the saved picture and PDF. On a divided board, "Read handwriting into text" reads each
area as one answer and keeps its label.

## 1.2.0

Handwriting inside the activities.

### New
**Write by hand in any written answer** — every answer box (Think-Pair-Share, Claim-Evidence-Reasoning, See-Think-Wonder and the pair or
group answer) has a "Write by hand" button. The student writes with a finger or pen and then chooses:
*Turn into text* — the handwriting reader types it into the box, where it can be corrected before locking.
*Lock my handwriting as my answer* — the handwriting itself is the answer. Partners, the teacher and the report see it as a picture.
**Class whiteboard on the smartboard** — the projector view has "Open class whiteboard" in every activity: a full-screen board with four
pen colours, three sizes, eraser, undo and clear, where several students write at the same time. Save options: "Save to this activity"
(the teacher's control view and the session report show it), "Read handwriting into text" (checked beside the handwriting, then saved
with the board), "Save as picture" and "Save as PDF". After saving, the board clears for the next question.
The reader is the browser's built-in one where there is one; otherwise it is downloaded once (about 64 MB).

**New look** — a deeper sea background, a first screen with a living reef and rising bubbles, lifted cards and brighter buttons.
Motion is switched off for anyone whose device asks for reduced motion.
**Maker credit** — "Designed by Mr. Hany Taha" on the first screen, the student app, the projector, the dashboard and the report.

### Good to know
Handwritten answers and saved class boards are stored with the session as pictures. A handwritten answer cannot be compared word by word,
so "revised" is recorded whenever the second handwritten answer is a different picture from the first.

## 1.1.1

### Fixed
Students whose session was deleted by the teacher now see "This session has finished" instead of a blank screen.

## 1.1.0

One teacher passcode instead of email, and students can write their own names on the smartboard.

### New
**Smartboard name writing** — when you add a class (in New session or in Classes), tap "Students write their names on the
smartboard". Two ways to write:
*One at a time, with the reader* — a student writes their first name, taps "Read my name", checks the typed result and taps "Add me to the class".
*Whiteboard: everyone writes* — a full-screen board with four pen colours, three pen sizes, eraser, undo and clear. The whole class writes
their names anywhere, several students at the same time (multi-touch). "Read all names" turns each one into text beside a picture of its
handwriting for checking, or type the names yourself. Save options: "Save as picture" (PNG) and "Save as PDF"; an unfinished board is kept
on the device until you clear it or add its names.
The reader is the browser's built-in one where there is one; otherwise the app offers to download a free reader once (about 64 MB).
Names can always be corrected or typed. Only first names are saved to the class; the handwriting is never uploaded.
**Teacher passcode** — email accounts are gone. The first visit to "I am a teacher" asks you to create a passcode (8 characters or more);
a new device asks for it once. "Lock dashboard" forgets it on that device. The dashboard, control view and report all sit behind it.

### Database
Run `supabase/update-1.1.sql` once in the Supabase SQL editor (after `schema.sql`).

## 1.0.0

First release of CoLab Reef: a teacher dashboard, projector view and student app for live collaborative learning.

### Open it
**https://mrhany80.github.io/Colab.-Reef-Classroom/** on any phone, tablet or laptop. Nothing to install.
Teachers choose "I am a teacher"; students choose "I am a student" and enter the 6-character code, or scan the QR code on the projector.

### What is in it
**12 activities** — Think-Pair-Share, Jigsaw, Four Corners, Claim-Evidence-Reasoning, Gallery Walk, Station Rotation,
See-Think-Wonder, KWL, Hinge Question with re-vote, 3-2-1 Exit Ticket, Numbered Heads Together and Collaborative Concept Map,
each with sample biology content (osmosis, enzymes, photosynthesis, genetics) that you can edit.
**Three room modes** — Online, Onsite with devices, Onsite with one device.
**Shared engine** — timed phases (start, pause, extend, skip), answers that lock before any peer content is shown,
grouping (random, teacher-set, by different answers), turn lock and author tags, Lesson Playlist.
**Praise Engine** — automatic praise for target behaviours, written as name + behaviour + effect, private by default;
teacher praise prompts, Praise Radar, a reinforcement schedule you can change, and the Living Reef that grows with every praise.
**Session report** — participation per student, answers before and after peer talk, praise by behaviour, CSV and PDF.
**Classes** — add a class while creating a session (name plus pasted or CSV first names), or manage classes in the Classes tab.

### Good to know
Until a Supabase project is connected the site runs in demo mode: it syncs between tabs on one device only.
See "Go live" in the README. Only first names and class names are stored.
