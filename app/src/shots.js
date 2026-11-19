// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the finished poster on its own. The query
// picks the sample photo (samples/<photo>.jpg), the caption words, the tagline
// and the post size (?size=square|portrait|wide). window.__shotReady is set
// once the poster has been painted, so a screenshot never catches it mid-draw.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'VICE SUNSET';
  const tagline = query.get('tagline') ?? 'A POSTER BY YOU';
  const size = query.get('size') ?? 'square';
  await load(`samples/${photo}.jpg`, caption, tagline, size);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
