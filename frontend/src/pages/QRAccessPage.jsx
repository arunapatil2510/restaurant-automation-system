import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check, ExternalLink, ArrowLeft, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const QRAccessPage = () => {
  const { tableNumber, setTableNumber } = useCart();
  const [selectedTable, setSelectedTable] = useState(tableNumber || 1);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const targetUrl = `${window.location.origin}/menu?table=${selectedTable}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadPng = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20, 260, 260);
      URL.revokeObjectURL(url);

      const a = document.createElement('a');
      a.download = `RESTOSMART_Table_${selectedTable}_QR.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = url;
  };

  return (
    <div className="qr-page-wrapper">
      <div className="container qr-page-content">
        {/* Header */}
        <div className="qr-page-header">
          <div className="qr-badge">
            <QrCode size={16} /> Table Access System
          </div>
          <h1 className="qr-page-title">Generate Table QR Codes</h1>
          <p className="qr-page-subtitle">
            Select a table number to generate its dedicated QR code. Diners scanning this QR code will automatically have their orders bound to that table.
          </p>
        </div>

        <div className="qr-layout-grid">
          {/* Left Column: Table Selector Grid & Instructions */}
          <div className="qr-selector-column">
            <div className="qr-card">
              <h3 className="qr-card-title">1. Select Table Number</h3>
              <p className="qr-card-subtitle">Choose from active tables (1 to 20):</p>

              <div className="table-numbers-grid">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    className={`table-select-btn ${selectedTable === num ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTable(num);
                      setTableNumber(num);
                    }}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            </div>

            <div className="qr-card instructions-card">
              <h3 className="qr-card-title">How Table QR Ordering Works</h3>
              <ol className="qr-instructions-list">
                <li>Download or print the QR code for each specific table.</li>
                <li>When a diner scans the QR code with their phone camera, the menu opens with <code>?table={selectedTable}</code>.</li>
                <li>All dishes added to the cart are automatically tied to <strong>Table #{selectedTable}</strong>.</li>
                <li>The kitchen receives orders with the exact table location for delivery.</li>
              </ol>
            </div>
          </div>

          {/* Right Column: Live QR Code Card & Export Actions */}
          <div className="qr-preview-column">
            <div className="qr-preview-card">
              <div className="qr-table-tag">
                Table <strong>#{selectedTable}</strong>
              </div>

              {/* QR Code Container */}
              <div className="qr-box" ref={qrRef}>
                <QRCodeSVG
                  value={targetUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#1b5e20"
                  level="H"
                  includeMargin={true}
                />
              </div>

              <span className="qr-scan-hint">Scan with phone camera to order</span>

              {/* URL Display */}
              <div className="qr-url-box">
                <span className="qr-url-label">Target Menu URL:</span>
                <span className="qr-url-text">{targetUrl}</span>
              </div>

              {/* Action Buttons */}
              <div className="qr-actions-group">
                <Link
                  to={`/menu?table=${selectedTable}`}
                  className="btn btn-primary btn-block"
                >
                  <ExternalLink size={16} /> Open Menu for Table #{selectedTable}
                </Link>

                <div className="qr-action-row">
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={handleDownloadPng}
                  >
                    <Download size={16} /> Download PNG
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
