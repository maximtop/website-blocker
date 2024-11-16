import React from 'react';

export function App() {
    const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        window.close();
    };

    return (
        <div
            className="d-flex align-items-center justify-content-center"
            style={{
                height: '100vh',
                textAlign: 'center',
            }}
        >
            <div>
                <h1 className="display-4 text-success">Oops! This website is blocked</h1>
                <p>Stay focused and keep up the good work!</p>
                <button
                    type="button"
                    className="btn btn-primary mt-3"
                    onClick={handleCloseClick}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
