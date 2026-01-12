import { useEffect, useRef, useState } from 'react';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';

function QuickSightDashboard({
  embedUrl,
  dashboardId,
  title,
  onRemove,
  height = '500px',
}) {
  const containerRef = useRef(null);
  const dashboardRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!embedUrl || !containerRef.current) return;

    let embeddingContext = null;

    const embedDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 이전 임베딩 정리
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // 임베딩 컨텍스트 생성
        embeddingContext = await createEmbeddingContext();

        // 대시보드 프레임 옵션
        const frameOptions = {
          url: embedUrl,
          container: containerRef.current,
          height: height,
          width: '100%',
          resizeHeightOnSizeChangedEvent: false,
          onChange: (changeEvent) => {
            console.log('Dashboard change event:', changeEvent);
          },
        };

        // 대시보드 콘텐츠 옵션
        const contentOptions = {
          toolbarOptions: {
            export: true,
            undoRedo: true,
            reset: true,
          },
          sheetOptions: {
            initialSheetId: undefined,
            singleSheet: false,
            emitSizeChangedEventOnPercentageHeight: false,
          },
          attributionOptions: {
            overlayContent: false,
          },
          onMessage: async (messageEvent) => {
            console.log('Dashboard message:', messageEvent);

            switch (messageEvent.eventName) {
              case 'CONTENT_LOADED':
                console.log('Dashboard content loaded');
                setIsLoading(false);
                break;
              case 'ERROR_OCCURRED':
                console.error('Dashboard error:', messageEvent);
                setError(messageEvent.message || 'Dashboard loading failed');
                setIsLoading(false);
                break;
              case 'PARAMETERS_CHANGED':
                console.log('Parameters changed:', messageEvent);
                break;
              case 'SELECTED_SHEET_CHANGED':
                console.log('Sheet changed:', messageEvent);
                break;
              default:
                break;
            }
          },
        };

        // 대시보드 임베딩
        dashboardRef.current = await embeddingContext.embedDashboard(
          frameOptions,
          contentOptions
        );

        console.log('Dashboard embedded successfully');
      } catch (err) {
        console.error('Failed to embed dashboard:', err);
        setError(err.message || 'Failed to embed dashboard');
        setIsLoading(false);
      }
    };

    embedDashboard();

    // 정리 함수
    return () => {
      if (dashboardRef.current) {
        dashboardRef.current = null;
      }
    };
  }, [embedUrl, height]);

  const handleRefresh = async () => {
    if (dashboardRef.current) {
      try {
        // 대시보드 데이터 새로고침은 re-embedding으로 처리
        setIsLoading(true);
        window.location.reload();
      } catch (err) {
        console.error('Failed to refresh dashboard:', err);
      }
    }
  };

  const handleOpenInQuickSight = () => {
    const quicksightUrl = `https://us-east-1.quicksight.aws.amazon.com/sn/dashboards/${dashboardId}`;
    window.open(quicksightUrl, '_blank');
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>{title || `Dashboard: ${dashboardId}`}</h3>
        <div className="widget-actions">
          <button
            className="btn-icon btn-quicksight"
            onClick={handleOpenInQuickSight}
            title="QuickSight에서 열기"
          >
            Open in QuickSight
          </button>
          <button className="btn-icon" onClick={handleRefresh} title="새로고침">
            Refresh
          </button>
          {onRemove && (
            <button
              className="btn-icon"
              onClick={onRemove}
              title="위젯 제거"
              style={{ color: '#dc2626' }}
            >
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

export default QuickSightDashboard;
