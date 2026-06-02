import { forwardRef } from 'react';
import type { Artwork } from '../../types';
import { 
  getCategory, 
  getMediumDisplay, 
  getEditionDisplay,
  translateTitle,
  formatCOAID,
  getVisualDescription
} from '../../lib/pdfHelpers';

interface CertificatePreviewProps {
  artwork: Artwork;
  coaId: string;
  issueDate?: Date;
  seriesTitle?: string;
  editionStr?: string;
}

export const CertificatePreview = forwardRef<HTMLDivElement, CertificatePreviewProps>(
  ({ artwork, coaId, seriesTitle }, ref) => {
    const editionDisplay = getEditionDisplay(
      artwork.edition_number,
      (artwork as Artwork & { print_run_total?: number }).print_run_total
    );

    const categoryDisplay = getCategory(artwork.medium);

    const mediumDisplay = getMediumDisplay(artwork.medium, artwork.support);

    const translatedTitle = translateTitle(artwork.artwork_title);
    const formattedCoaId = formatCOAID(coaId);
    const descriptionText = getVisualDescription();

    return (
      <div
        id={`certificate-preview-${coaId}`}
        ref={ref}
        className="coa-container bg-[#ffffff] text-[#000000] mx-auto"
      >
        {/* HEADER */}
        <div className="coa-header">
          <h1 className="coa-title-main">
            CERTIFICATE
          </h1>
          <div className="coa-title-sub">
            of Authenticity
          </div>
          <h2 className="coa-title-type">
            OF ORIGINAL ARTWORK
          </h2>
          <h3 className="coa-artist">
            {(artwork.artist_name || 'NANY ARRUDA').toUpperCase()}
          </h3>
        </div>

        {/* IMAGE */}
        <div className="coa-image-section">
          {artwork.cover_image || (artwork.artwork_images && artwork.artwork_images[0]) ? (
            <div className="coa-image-wrapper">
              <img
                src={`${artwork.cover_image || artwork.artwork_images?.[0]}?t=${Date.now()}`}
                alt={artwork.artwork_title}
                crossOrigin="anonymous"
                className="coa-image"
              />
            </div>
          ) : (
            <div className="coa-image-placeholder">
              <span className="coa-placeholder-text">
                image
              </span>
            </div>
          )}
        </div>

        {/* METADATA TABLE */}
        <div className="coa-metadata-table">
          {/* Left Column */}
          <div className="coa-metadata-col">
            <div className="coa-metadata-row">
              <span className="coa-label">TITLE:</span>
              <span className="coa-value coa-value-ellipsis italic !font-serif">
                {translatedTitle}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">YEAR:</span>
              <span className="coa-value">
                {(artwork.creation_year?.toString() || 'N/A').toUpperCase()}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">CATEGORY:</span>
              <span className="coa-value coa-value-ellipsis">
                {categoryDisplay}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">SERIES:</span>
              <span className="coa-value coa-value-ellipsis">
                {(seriesTitle || artwork.series_reference || 'N/A').toUpperCase()}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">EDITION:</span>
              <span className="coa-value coa-value-ellipsis">
                {editionDisplay}
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div className="coa-metadata-col">
            <div className="coa-metadata-row">
              <span className="coa-label">ARTIST:</span>
              <span className="coa-value coa-value-ellipsis">
                {(artwork.artist_name || 'NANY ARRUDA').toUpperCase()}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">DIMENSIONS:</span>
              <span className="coa-value">
                {(artwork.dimensions_formatted || 'N/A').toUpperCase()}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">MEDIUM:</span>
              <span className="coa-value coa-value-ellipsis">
                {mediumDisplay}
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">STATUS:</span>
              <span className="coa-value">
                UNIQUE ORIGINAL - SIGNED BY THE ARTIST
              </span>
            </div>
            <div className="coa-metadata-row">
              <span className="coa-label">COA ID:</span>
              <span className="coa-value">
                {formattedCoaId}
              </span>
            </div>
          </div>
        </div>

        {/* VISUAL DESCRIPTION */}
        <div className="coa-description-section">
          <p className="coa-description-text">
            <span className="coa-description-label">VISUAL DESCRIPTION:</span>
            {descriptionText}
          </p>
        </div>

        {/* FOOTER */}
        <div className="coa-footer">
          {/* LEFT BLOCK — Signature */}
          <div className="coa-footer-block">
            <div className="coa-signature-line"></div>
            <span className="coa-signature-label">SIGNATURE</span>
            <span className="coa-signature-date">__ / __ / 20__</span>
            <span className="coa-signature-location">PORTO, PORTUGAL</span>
          </div>

          {/* CENTER BLOCK — Authenticity Stamp */}
          <div className="coa-footer-block">
            <img
              src="/stamp.png"
              alt="Authenticity Stamp"
              className="coa-stamp-image"
              crossOrigin="anonymous"
            />
          </div>

          {/* RIGHT BLOCK — Seal */}
          <div className="coa-footer-block">
            <span className="coa-seal-text">SEAL</span>
          </div>
        </div>
      </div>
    );
  }
);

CertificatePreview.displayName = 'CertificatePreview';
