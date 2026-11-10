#!/usr/bin/env python3
"""Create childlike playback voices from original recordings.

Usage: python3 tools/process-letter-audio.py /absolute/path/original-letter-audio.tar.gz
Requires FFmpeg with the rubberband filter. Never uses processed files as input.
"""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_AUDIO_REF = '5c4191d20c16688fc84b2d18c24b3dce722e7ee8'
FILTER = 'rubberband=pitch=1.334840:formant=shifted,highpass=f=120,lowpass=f=9000,loudnorm=I=-18:TP=-2:LRA=7'


def main():
    archive_path = Path(sys.argv[1]).resolve()
    paths = set()
    for mapping in [ROOT / 'sounds.json', ROOT / 'extra-letters/sounds.json']:
        payload = json.loads(mapping.read_text())
        paths.update((mapping.parent / value).relative_to(ROOT) for value in payload.get('symbols', payload).values())
    with tempfile.TemporaryDirectory(prefix='fidel-audio-') as scratch:
        scratch = Path(scratch)
        with tarfile.open(archive_path, 'r:gz') as archive:
            for path in paths:
                source = archive.extractfile(str(path))
                if source is None:
                    raise ValueError(f'Original missing: {path}')
                target = scratch / 'original' / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read())

        # Include the celebration speech recordings.
        # Read their originals from Git so reruns never stack voice effects.
        for path in [Path('audio/variant-unlock.mp3'), Path('audio/final-celebration.mp3')]:
            original = subprocess.run(['git', 'show', f'{ORIGINAL_AUDIO_REF}:{path.as_posix()}'],
                                      cwd=ROOT, check=True, capture_output=True).stdout
            target = scratch / 'original' / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(original)
            paths.add(path)

        def process(path):
            target = scratch / 'processed' / path
            target.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                            '-i', str(scratch / 'original' / path), '-map_metadata', '-1',
                            '-af', FILTER, '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame',
                            '-q:a', '3', str(target)], check=True)
            return path

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for count, _ in enumerate(pool.map(process, sorted(paths)), 1):
                if count % 50 == 0:
                    print(f'Processed {count}/{len(paths)}', flush=True)
        # Replace playback files only after every conversion succeeds.
        for path in paths:
            (ROOT / path).write_bytes((scratch / 'processed' / path).read_bytes())
        print(f'Updated all {len(paths)} recordings with a childlike voice.', flush=True)


if __name__ == '__main__':
    main()
