# Changelog

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
