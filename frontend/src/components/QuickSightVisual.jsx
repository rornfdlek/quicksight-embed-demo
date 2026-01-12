import { useEffect, useRef, useState } from 'react';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';

const DASHBOARD_ID = '455b132a-9856-4bac-9777-c76fef90d10c';

function QuickSightVisual({
  embedUrl,
  visualId,
  title,
  onRemove,
  height = '400px',
}) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!embedUrl || !containerRef.current) return;

    const embedVisual = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const embeddingContext = await createEmbeddingContext();

        const frameOptions = {
          url: embedUrl,
          container: containerRef.current,
          height: height,
          width: '100%',
          onChange: (changeEvent) => {
            console.log('Visual change event:', changeEvent);
          },
        };

        const contentOptions = {
          onMessage: async (messageEvent) => {
            console.log('Visual message:', messageEvent);
            if (messageEvent.eventName === 'CONTENT_LOADED') {
              setIsLoading(false);
            } else if (messageEvent.eventName === 'ERROR_OCCURRED') {
              setError(messageEvent.message || 'Visual loading failed');
              setIsLoading(false);
            }
          },
        };

        await embeddingContext.embedVisual(frameOptions, contentOptions);
      } catch (err) {
        console.error('Failed to embed visual:', err);
        setError(err.message || 'Failed to embed visual');
        setIsLoading(false);
      }
    };

    embedVisual();
  }, [embedUrl, height]);

  const handleOpenInQuickSight = () => {
    const quicksightUrl = `https://us-east-1.quicksight.aws.amazon.com/sn/dashboards/${DASHBOARD_ID}`;
    window.open(quicksightUrl, '_blank');
  };

  return (
    <div className="visual-widget">
      <div className="widget-header">
        <h3>{title}</h3>
        <div className="widget-actions">
          <button
            className="btn-icon btn-quicksight"
            onClick={handleOpenInQuickSight}
            title="QuickSight에서 열기"
          >
            Open in QuickSight
          </button>
          {onRemove && (
            <button className="btn-icon" onClick={onRemove} style={{ color: '#dc2626' }}>
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="widget-content" style={{ height }}>
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

export default QuickSightVisual;
