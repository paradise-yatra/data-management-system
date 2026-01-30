import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const GlobalShortcuts = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if Ctrl + H was pressed
            if (event.ctrlKey && event.key.toLowerCase() === 'h') {
                // Don't navigate if the user is typing in an input, textarea, or contentEditable element
                const target = event.target as HTMLElement;
                const isTyping =
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable;

                if (!isTyping) {
                    event.preventDefault(); // Prevent default browser behavior (like history)
                    navigate('/');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigate]);

    return null;
};
