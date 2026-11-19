// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the finished poster on its own. The query
// picks the sample photo (samples/<photo>.jpg), the caption words, the neon
// subtitle, the tagline, the post size (?size=square|portrait|wide), the
// panel layout (?layout=hero|fullbleed|grid|tilted), the colour grade
// (?grade=sunset|neon|dusk|mono), Poster Ink (?ink=1) and the heat
// (?heat=0..100). window.__shotReady is set once the poster has been
// painted, so a screenshot never catches it mid-draw.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const scene = {
    sample: `samples/${photo}.jpg`,
    caption: query.get('caption') ?? 'VICE SUNSET',
    subtitle: query.get('subtitle') ?? 'neon nights',
    tagline: query.get('tagline') ?? 'A POSTER BY YOU',
    size: query.get('size') ?? 'square',
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    ink: query.get('ink') === '1',
    heat: Number(query.get('heat') ?? '70'),
  };
  await load(scene);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
