# Practice links and readability update

## Advanced reading for all alphabet families

Use Previous and Next to move freely between Seven forms, Listening exercise,
Order the alphabets, Reading One, Reading Two, Reading Three, and Advanced
Reading. No activity must be completed to navigate. Exercise progress is
preserved while moving between stages and reset when choosing another family.
Advanced Reading shows
the 30 most frequent words beginning with any of that family's seven forms, ordered by
frequency. The displayed numbers are counts from `assets/ti_word_count_grouped.txt`,
not difficulty ratings. The list is based on corpus frequency and has not been
independently reviewed for age suitability or pronunciation. Because the ranking
is across the whole family, some individual forms may not appear in the top 30.
The lists are stored with each family's other readings in `src/data/readingPractice.json`.

Copy the address from the browser after opening a section. These bookmarks work with the existing hosted URL and require no server routing changes:

| Section | URL ending |
| --- | --- |
| Learn | `#learn` |
| Test 1 | `#test1` |
| Test 2 | `#test2` |
| More | `#more` |
| Home | `#home` |

Direct links, refresh, and browser Back/Forward preserve the selected section. Each learner retains their own progress; links do not reset progress or select a specific letter or variant. Test 2 opened directly waits for Play Prompt.

Letters and filled answer slots are larger and more colourful. Empty placeholders, headings, and supporting controls are smaller. The theme picker says **Your fav color** in neutral text; the theme names use their matching colours. The SIL Open Font License Noto Sans Ethiopic font and its license are bundled locally for devices without an Ethiopic font. Keyboard focus and reduced-motion preferences are supported.

## Childlike voices

All 273 MP3 recordings (270 letters, two celebrations, and the remaining project recording) use a lighter voice effect: pitch raised five semitones, shifted formants, preserved timing, normalized volume, and stripped metadata. These are processed original voices, not recordings by children or guaranteed anonymization. A fluent-speaker pronunciation review is still recommended. Browser-synthesized spoken feedback also uses a higher pitch. Versioned audio URLs avoid previously cached recordings.

To regenerate, run `python3 tools/process-letter-audio.py /absolute/path/to/original-letter-audio.tar.gz` with the existing external archive of original letter recordings. Requires FFmpeg with the rubberband filter. The script reads the remaining original recordings from the pinned pre-processing Git revision, avoiding cumulative processing on reruns. It writes playback files only after every conversion succeeds. Backups are not included in this repository update.

## Validation

Chromium checks passed for direct section links, refresh, Back/Forward, Learn playback, Test 1 placement, Test 2 prompt playback, admin audio loading, and unknown-bookmark fallback. Layouts were checked at 320, 390, 768, and 1280 pixels with no page overflow or clipped letter buttons. Desktop and mobile screenshots were reviewed with the bundled font loaded. All six theme selections and their matching text colours were verified. No JavaScript errors were reported.

All 273 childlike recordings decoded successfully with FFmpeg, and browser playback fetched the updated audio version. `git diff --check` passed.

## Detailed practice bookmarks

The browser address now tracks the current part, variant, and additional-letter set automatically. Use the existing activity controls, then copy the address bar, or construct a specific assignment URL using the examples below. No extra assignment dropdown is added. The original `#learn`, `#test1`, `#test2`, and `#more` links still work.

Examples to append to the hosted app address:

- `#/learn/part/1/ግእዝ` — Learn, Part 1, first variant.
- `#/learn/part/2/ሳብዕ` — Learn, Part 2, seventh variant.
- `#/test2/part/1/ካዕብ` — listening test, Part 1, second variant.
- `#/test1/part/1` — Test 1, Part 1 (14 rows / 98 letters).
- `#/test1/part/2` — Test 1, Part 2 (13 rows / 91 letters).
- `#/more/set/group-phe/learn` — additional-letter set, Learn.
- `#/more/set/group-phe/test` — the same set, arranging test.

The seven variant names are `ግእዝ`, `ካዕብ`, `ሣልስ`, `ራብዕ`, `ኀምስ`, `ሳድስ`, and `ሳብዕ`. There are 56 detailed assignment URLs. URLs use a hash path so they work on static hosting and when refreshed; a bare `/learn/part/...` server path is not required. Browsers may percent-encode Ethiopic characters when copying; those URLs also work.

Explicit assignments can open later parts and variants on a fresh learner device without requiring earlier completion. Opening a link does not award mastery or reset saved scores. Learn review progress survives refresh. Previously mastered Learn Part 1 assignments use a fresh review counter, preserving the review fix.

On phones the navigation and existing activity controls come first. The branding and large preview no longer push letters below the first screen. Instructions, progress, appearance, and set browsing expand on demand. Matching activities show their letter bank above the answer slots.

Validation for this update: all 81 offered assignments were opened in Chromium; the 28 variant/part links were also refreshed individually. Browser history, encoded variant names, saved review progress, bookmark titles, and expanded controls were checked. Layouts were exercised at 320, 390, 768, and 1280 pixels. Nine automated tests cover routing, review progression, and bookmarked set progression. Completing a later family returns to any earlier unfinished family before declaring the set complete.


Test 1 now shares only two part URLs. Its address stays unchanged while progressing through rows within a part, and opening or reloading a Test 1 part starts at its first row while keeping recorded mastery. Old set/family URLs remain accepted for compatibility, then become the simpler part URL. Every correct placement plays the corresponding letter recording; incorrect placements do not. Completion feedback waits for the final recording to finish. Twelve automated tests cover routing, review and row progression, and correct-answer audio.

Test 1 entry now starts Part 1 at ሀ. Explicit Part 2 links start at ሠ. Previously recorded completion is retained; saved row position no longer skips the first row when opening a part.

## Reset for a new learner

A shared **Reset Progress** button is visible on Home, Learn, Test 1, Test 2, and More. Confirmation explicitly says that all four activities are reset for the active learner. Cancelling leaves progress unchanged. Confirming stops playback, clears progress, scores, completion, and review state across all activities, and leaves the user in the current section at its beginning. The address changes to that starting assignment so a refresh cannot reopen the previous advanced assignment. Theme and profile details are retained. Saved progress remains cleared after reload.
