# AI Executive Team

AI-driven executive team simulation using crewAI. This project allows you to interact with an AI CEO who coordinates with other AI executives (CFO, COO, CMO, Legal) to formulate comprehensive solutions and decision making.

## Features

- AI CEO coordinates with AI executives to respond to your queries
- Knowledge base for AI executives to reference
- Email notifications with comprehensive reports
- Web interface for easy interaction
- User management and authentication

## Architecture

The project consists of two main components:

### Backend (FastAPI + PostgreSQL + crewAI)

- API server built with FastAPI
- PostgreSQL database for structured data
- Pinecone for vector storage and semantic search
- CrewAI for AI executive team coordination
- Gmail API for email notifications

### Frontend (React + TypeScript)

- Modern UI built with React and TypeScript
- Real-time chat interface
- Document management
- AI executive configuration

## Setup

### Prerequisites

- Python 3.9+
- Node.js 14+
- PostgreSQL
- OpenAI API key
- Pinecone API key
- Google API credentials for Gmail

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd ai-executive-team/backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the backend directory with the following variables:
   ```
   # Database
   POSTGRES_HOST=localhost
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=ai_executive_team
   POSTGRES_PORT=5432

   # Security
   SECRET_KEY=your_secret_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Pinecone
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENVIRONMENT=your_pinecone_environment

   # Email
   EMAIL_SENDER=youming@vchaoxi.com
   EMAIL_RECEIVER=youming@vchaoxi.com
   ```

5. Initialize the database:
   ```
   alembic upgrade head
   ```

6. Start the backend server:
   ```
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd ai-executive-team/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the frontend directory with the following variables:
   ```
   REACT_APP_API_URL=http://localhost:8000/api/v1
   REACT_APP_WS_URL=ws://localhost:8000/ws
   ```

4. Start the frontend development server:
   ```
   npm start
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Log in with your credentials
3. Start chatting with your AI CEO
4. Upload documents to the knowledge base
5. Configure AI executives as needed

## Development

### Project Structure

```
ai-executive-team/
├── backend/
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── core/        # Core settings
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Utilities
│   │   └── knowledge/   # Knowledge base management
│   ├── alembic/         # Database migrations
│   └── tests/           # Unit tests
└── frontend/
    ├── public/          # Static files
    └── src/
        ├── components/  # React components
        ├── pages/       # Page components
        ├── services/    # API services
        ├── contexts/    # React contexts
        └── utils/       # Utilities
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
 