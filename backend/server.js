const express = require('express');
const cors = require('cors');
const {
  QuickSightClient,
  GenerateEmbedUrlForRegisteredUserCommand,
  GenerateEmbedUrlForAnonymousUserCommand,
  DescribeDashboardCommand,
} = require('@aws-sdk/client-quicksight');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// AWS QuickSight Client
const quicksightClient = new QuickSightClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
const QUICKSIGHT_NAMESPACE = process.env.QUICKSIGHT_NAMESPACE || 'default';

// 등록된 사용자용 임베딩 URL 생성
app.post('/api/embed/registered', async (req, res) => {
  try {
    const { dashboardId, userArn } = req.body;

    if (!dashboardId) {
      return res.status(400).json({ error: 'dashboardId is required' });
    }

    const command = new GenerateEmbedUrlForRegisteredUserCommand({
      AwsAccountId: AWS_ACCOUNT_ID,
      UserArn: userArn || process.env.QUICKSIGHT_USER_ARN,
      SessionLifetimeInMinutes: 600,
      ExperienceConfiguration: {
        Dashboard: {
          InitialDashboardId: dashboardId,
        },
      },
    });

    const response = await quicksightClient.send(command);

    res.json({
      embedUrl: response.EmbedUrl,
      status: response.Status,
    });
  } catch (error) {
    console.error('Error generating embed URL for registered user:', error);
    res.status(500).json({
      error: 'Failed to generate embed URL',
      message: error.message,
    });
  }
});

// 익명 사용자용 임베딩 URL 생성 (Public Embedding)
app.post('/api/embed/anonymous', async (req, res) => {
  try {
    const { dashboardId } = req.body;

    if (!dashboardId) {
      return res.status(400).json({ error: 'dashboardId is required' });
    }

    const command = new GenerateEmbedUrlForAnonymousUserCommand({
      AwsAccountId: AWS_ACCOUNT_ID,
      Namespace: QUICKSIGHT_NAMESPACE,
      SessionLifetimeInMinutes: 600,
      AuthorizedResourceArns: [
        `arn:aws:quicksight:${process.env.AWS_REGION}:${AWS_ACCOUNT_ID}:dashboard/${dashboardId}`,
      ],
      ExperienceConfiguration: {
        Dashboard: {
          InitialDashboardId: dashboardId,
        },
      },
    });

    const response = await quicksightClient.send(command);

    res.json({
      embedUrl: response.EmbedUrl,
      status: response.Status,
    });
  } catch (error) {
    console.error('Error generating embed URL for anonymous user:', error);
    res.status(500).json({
      error: 'Failed to generate embed URL',
      message: error.message,
    });
  }
});

// 개별 위젯(Visual) 임베딩 URL 생성
app.post('/api/embed/visual', async (req, res) => {
  try {
    const { dashboardId, sheetId, visualId, userArn } = req.body;

    if (!dashboardId || !sheetId || !visualId) {
      return res.status(400).json({ error: 'dashboardId, sheetId, visualId are required' });
    }

    const command = new GenerateEmbedUrlForRegisteredUserCommand({
      AwsAccountId: AWS_ACCOUNT_ID,
      UserArn: userArn || process.env.QUICKSIGHT_USER_ARN,
      SessionLifetimeInMinutes: 600,
      ExperienceConfiguration: {
        DashboardVisual: {
          InitialDashboardVisualId: {
            DashboardId: dashboardId,
            SheetId: sheetId,
            VisualId: visualId,
          },
        },
      },
    });

    const response = await quicksightClient.send(command);

    res.json({
      embedUrl: response.EmbedUrl,
      status: response.Status,
    });
  } catch (error) {
    console.error('Error generating embed URL for visual:', error);
    res.status(500).json({
      error: 'Failed to generate embed URL for visual',
      message: error.message,
    });
  }
});

// 대시보드 정보 조회
app.get('/api/dashboard/:dashboardId', async (req, res) => {
  try {
    const { dashboardId } = req.params;

    const command = new DescribeDashboardCommand({
      AwsAccountId: AWS_ACCOUNT_ID,
      DashboardId: dashboardId,
    });

    const response = await quicksightClient.send(command);

    res.json({
      dashboard: response.Dashboard,
      status: response.Status,
    });
  } catch (error) {
    console.error('Error describing dashboard:', error);
    res.status(500).json({
      error: 'Failed to get dashboard info',
      message: error.message,
    });
  }
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`QuickSight Embedding Backend Server running on port ${PORT}`);
  console.log(`AWS Region: ${process.env.AWS_REGION || 'ap-northeast-2'}`);
  console.log(`AWS Account ID: ${AWS_ACCOUNT_ID ? '***' + AWS_ACCOUNT_ID.slice(-4) : 'NOT SET'}`);
});
