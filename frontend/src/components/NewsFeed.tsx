import React from 'react';
import { NewsItem } from '../types';

interface Props { items: NewsItem[]; ticker: string; }

export default function NewsFeed({ items, ticker }: Props) {
  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">News Feed</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '1px' }}>
          {items.length} ARTICLES · {ticker}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '14px 16px' }}>
          <div className="bb-alert bb-alert-info">No news found for {ticker}. Try loading the chart first.</div>
        </div>
      ) : (
        <div className="bb-news-grid">
          {items.map((item, i) => (
            <div className="bb-news-item" key={i}>
              <div className="bb-news-n">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div className="bb-news-title">{item.title}</div>
                {item.published && <div className="bb-news-meta">{item.published}</div>}
                <a className="bb-news-link" href={item.link} target="_blank" rel="noopener noreferrer">
                  READ MORE →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
