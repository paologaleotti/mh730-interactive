// Evidence media inside the Detail Panel (spec §8). Manifest-driven: audio
// and image payloads are mirrored locally under /media/ (see public/media/),
// so audio renders a native player straight away and images load from the
// bundle. Remote embeds (YouTube) render their iframe directly so the player
// is ready without an extra click. Every item carries publisher + license.

import manifest from '../data/media.manifest.json'

const itemsFor = (featureId: string) =>
  manifest.items.filter((m) => m.featureIds.includes(featureId))

const Attribution = ({ publisher, license, pageUrl }: {
  publisher: string
  license: string
  pageUrl: string | null
}) => (
  <div className="media-attr">
    {publisher} · {license}
    {pageUrl && (
      <>
        {' · '}
        <a href={pageUrl} target="_blank" rel="noopener">source ↗</a>
      </>
    )}
  </div>
)

const Embed = ({ item }: { item: (typeof manifest.items)[number] }) => {
  if (!item.embedUrl) return null
  return (
    <iframe
      className="media-embed"
      src={item.embedUrl}
      title={item.title}
      loading="lazy"
      allow="encrypted-media; picture-in-picture"
      allowFullScreen
    />
  )
}

export const MediaSection = ({ featureId }: { featureId: string }) => {
  const items = itemsFor(featureId)
  if (!items.length) return null

  return (
    <div className="dp-section">
      <div className="dp-section-title">EVIDENCE MEDIA</div>
      {items.map((item) => (
        <div key={item.id} className="media-item">
          <div className="media-title">{item.title}</div>

          {item.kind === 'audio' && item.directUrl && (
            <>
              {/* Local file: preload metadata so the scrubber shows duration
                  up front; audio bytes still wait for the play button. */}
              <audio className="media-audio" controls preload="metadata" src={item.directUrl} />
              {/^.*time-compress/i.test(item.notes) && (
                <div className="media-note">Time-compressed audio, illustrative playback rate</div>
              )}
            </>
          )}

          {item.kind === 'image' && item.directUrl && (
            <a href={item.pageUrl ?? item.directUrl} target="_blank" rel="noopener">
              <img className="media-image" src={item.directUrl} alt={item.title} loading="lazy" />
            </a>
          )}

          {!item.directUrl && item.embedUrl && <Embed item={item} />}

          {!item.directUrl && !item.embedUrl && item.pageUrl && (
            <a className="dp-cite" href={item.pageUrl} target="_blank" rel="noopener">
              ↗ {item.title}
            </a>
          )}

          <Attribution publisher={item.publisher} license={item.license} pageUrl={item.pageUrl} />
        </div>
      ))}
    </div>
  )
}
