import { useState, useCallback } from 'react';
import QuickSightDashboard from './components/QuickSightDashboard';
import QuickSightVisual from './components/QuickSightVisual';

const API_BASE_URL = '/api';

// 대시보드 및 위젯 정보
const DASHBOARD_INFO = {
  dashboardId: '455b132a-9856-4bac-9777-c76fef90d10c',
  sheetId: '455b132a-9856-4bac-9777-c76fef90d10c_969b2ab6-af8d-4304-ad3f-2b0b962e5dfb',
  visuals: [
    {
      id: '455b132a-9856-4bac-9777-c76fef90d10c_365537fd-0749-4e61-96db-1ad170a7cc40',
      name: '지역별 매출 (Bar Chart)',
      type: 'bar',
    },
    {
      id: '455b132a-9856-4bac-9777-c76fef90d10c_cb24c813-2a0f-4dc6-9ff4-afb97fda8376',
      name: '제품별 매출 (Pie Chart)',
      type: 'pie',
    },
    {
      id: '455b132a-9856-4bac-9777-c76fef90d10c_084111ef-4134-4941-bcee-12f413c6f409',
      name: '일별 매출 추이 (Line Chart)',
      type: 'line',
    },
  ],
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboards, setDashboards] = useState([]);
  const [visuals, setVisuals] = useState([]);
  const [dashboardId, setDashboardId] = useState('');
  const [selectedVisual, setSelectedVisual] = useState('');
  const [embedType, setEmbedType] = useState('registered');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardEmbedUrl = useCallback(async (dashboardIdToEmbed, type) => {
    const endpoint =
      type === 'anonymous'
        ? `${API_BASE_URL}/embed/anonymous`
        : `${API_BASE_URL}/embed/registered`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardId: dashboardIdToEmbed }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get embed URL');
    }
    return response.json();
  }, []);

  const fetchVisualEmbedUrl = useCallback(async (visualId) => {
    const response = await fetch(`${API_BASE_URL}/embed/visual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboardId: DASHBOARD_INFO.dashboardId,
        sheetId: DASHBOARD_INFO.sheetId,
        visualId: visualId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get visual embed URL');
    }
    return response.json();
  }, []);

  // QuickSight URL에서 Dashboard ID 추출
  const extractDashboardId = (input) => {
    // URL 형식: https://us-east-1.quicksight.aws.amazon.com/sn/dashboards/xxxxx
    const urlMatch = input.match(/dashboards\/([a-f0-9-]+)/i);
    if (urlMatch) return urlMatch[1];

    // 이미 ID 형식이면 그대로 반환
    if (/^[a-f0-9-]+$/i.test(input)) return input;

    return input;
  };

  const handleAddDashboard = async (e) => {
    e.preventDefault();
    if (!dashboardId.trim()) {
      setError('Dashboard ID 또는 QuickSight URL을 입력하세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extractedId = extractDashboardId(dashboardId.trim());
      const data = await fetchDashboardEmbedUrl(extractedId, embedType);
      setDashboards((prev) => [
        ...prev,
        {
          id: `${extractedId}-${Date.now()}`,
          dashboardId: extractedId,
          embedUrl: data.embedUrl,
          title: `Dashboard: ${extractedId.slice(0, 8)}...`,
        },
      ]);
      setDashboardId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVisual = async (e) => {
    e.preventDefault();
    if (!selectedVisual) {
      setError('위젯을 선택하세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const visual = DASHBOARD_INFO.visuals.find((v) => v.id === selectedVisual);
      const data = await fetchVisualEmbedUrl(selectedVisual);
      setVisuals((prev) => [
        ...prev,
        {
          id: `${selectedVisual}-${Date.now()}`,
          visualId: selectedVisual,
          embedUrl: data.embedUrl,
          title: visual?.name || 'Widget',
        },
      ]);
      setSelectedVisual('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDashboard = (id) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRemoveVisual = (id) => {
    setVisuals((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>QuickSight Dashboard Embedding</h1>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            전체 대시보드
          </button>
          <button
            className={`tab-btn ${activeTab === 'widget' ? 'active' : ''}`}
            onClick={() => setActiveTab('widget')}
          >
            개별 위젯
          </button>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'dashboard' ? (
          <>
            <div className="dashboard-config">
              <form className="config-form" onSubmit={handleAddDashboard}>
                <div className="form-group">
                  <label htmlFor="dashboardId">Dashboard ID</label>
                  <input
                    id="dashboardId"
                    type="text"
                    value={dashboardId}
                    onChange={(e) => setDashboardId(e.target.value)}
                    placeholder="Dashboard ID 또는 QuickSight URL 붙여넣기"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="embedType">임베딩 유형</label>
                  <select
                    id="embedType"
                    value={embedType}
                    onChange={(e) => setEmbedType(e.target.value)}
                  >
                    <option value="registered">등록된 사용자</option>
                    <option value="anonymous">익명 사용자</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? '로딩 중...' : '대시보드 추가'}
                </button>
              </form>
              {error && <div className="error-message">{error}</div>}
            </div>

            {dashboards.length === 0 ? (
              <div className="info-message">
                Dashboard ID를 입력하고 "대시보드 추가" 버튼을 클릭하세요.
              </div>
            ) : (
              <div className="dashboard-grid">
                {dashboards.map((dashboard) => (
                  <QuickSightDashboard
                    key={dashboard.id}
                    embedUrl={dashboard.embedUrl}
                    dashboardId={dashboard.dashboardId}
                    title={dashboard.title}
                    onRemove={() => handleRemoveDashboard(dashboard.id)}
                    height="800px"
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="dashboard-config">
              <form className="config-form" onSubmit={handleAddVisual}>
                <div className="form-group" style={{ minWidth: '300px' }}>
                  <label htmlFor="visualSelect">위젯 선택</label>
                  <select
                    id="visualSelect"
                    value={selectedVisual}
                    onChange={(e) => setSelectedVisual(e.target.value)}
                  >
                    <option value="">-- 위젯을 선택하세요 --</option>
                    {DASHBOARD_INFO.visuals.map((visual) => (
                      <option key={visual.id} value={visual.id}>
                        {visual.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? '로딩 중...' : '위젯 추가'}
                </button>
              </form>
              {error && <div className="error-message">{error}</div>}
            </div>

            {visuals.length === 0 ? (
              <div className="info-message">
                위젯을 선택하고 "위젯 추가" 버튼을 클릭하세요.
                <br />
                <small>개별 차트를 따로 임베딩할 수 있습니다.</small>
              </div>
            ) : (
              <div className="visual-grid">
                {visuals.map((visual) => (
                  <QuickSightVisual
                    key={visual.id}
                    embedUrl={visual.embedUrl}
                    visualId={visual.visualId}
                    title={visual.title}
                    onRemove={() => handleRemoveVisual(visual.id)}
                    height="400px"
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
