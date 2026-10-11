import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AttendanceHistoryPage from "./pages/AttendanceHistoryPage";

function App() {

    const token = localStorage.getItem("token");
    const path = window.location.pathname;

    if (path === "/attendance-history" && token) {
        return <AttendanceHistoryPage />;
    }

    if (path === "/dashboard" && token) {
        return <Dashboard />;
    }

    return <Login />;
}

export default App;

