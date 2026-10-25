// Who made the artwork Frame Studio draws with (Help → Artwork credits): the
// game-icons.net ornaments ask for credit (CC BY 3.0); the photo textures
// are public domain (CC0) and are credited anyway. docs/CREDITS.md says the
// same.

import { ICON_GLYPHS } from '../project/iconGlyphs';
import { PICTURES } from '../project/pictures';

const AUTHORS = [...new Set(ICON_GLYPHS.map((g) => g.author))];

export function Credits() {
  return (
    <details className="credits">
      <summary>Artwork credits</summary>
      <p>
        The ornaments marked “(icon)” are from <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a>, by {AUTHORS.join(', ')}, under{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Frame Studio draws them from their outlines and can
        stretch and recolour them.
      </p>
      <ul>
        {ICON_GLYPHS.map((g) => (
          <li key={g.id}>
            <a href={g.source} target="_blank" rel="noreferrer">
              {g.name}
            </a>{' '}
            by {g.author}
          </li>
        ))}
      </ul>
      <p>
        The photo textures are from <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven</a> and{' '}
        <a href="https://ambientcg.com" target="_blank" rel="noreferrer">ambientCG</a>, public domain (CC0), made smaller for Frame Studio:{' '}
        {PICTURES.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ', '}
            <a href={p.source} target="_blank" rel="noreferrer">
              {p.name}
            </a>
          </span>
        ))}
        .
      </p>
    </details>
  );
}
