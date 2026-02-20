# SHAZIN Project: Run Instructions

## Backend (Flask API)

1. **Install Python 3.8+** (if not already installed).
2. Open a terminal and navigate to the `backend` directory:
   ```sh
   cd backend
   ```
3. **Install dependencies**:
   ```sh
   pip install -r requirement.txt
   ```
4. **Set environment variables** (optional, for production):
   - `FLASK_SECRET`: Secret key for Flask sessions.
   - `GOOGLE_API_KEY`: (Optional) For Gemini AI features.
5. **Run the Flask app**:
   ```sh
   python app.py
   ```
   The backend will start at `http://127.0.0.1:5000/` by default.

## Frontend

- The frontend is in the `frontend/templates` and `frontend/static` folders.
- Open `frontend/templates/index.html` in your browser.
- For full functionality (login, meal planning, etc.), ensure the backend is running.

## Data
- The app uses `data/foods.csv` and creates a `diet.db` database file.

pock u

## Notes
- If you want to use Gemini AI chat, set the `GOOGLE_API_KEY` environment variable before running the backend.
- For any issues, check the terminal for error messages.
