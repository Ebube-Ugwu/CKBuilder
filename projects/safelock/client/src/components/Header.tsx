import {FaMoon, FaSun} from "react-icons/fa";
import {useState} from "react";

const Header = () => {
    const [isDarkMode, setDarkMode] = useState<boolean>(document.documentElement.classList.contains('dark'));
    const toggleDarkMode = () => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.remove('dark');
            setDarkMode(false);
            return;
        } else {
            root.classList.add('dark');
            setDarkMode(true);
        }
    }

    return (
        <header className="flex justify-between items-center p-4 text-foreground">
            <h1 className="text-3xl font-extrabold">SafeLock</h1>
            <div aria-label="Toggle dark light modes" onClick={toggleDarkMode}>
                {isDarkMode ? (<FaSun/>) : (<FaMoon/>)}
            </div>
        </header>
    );
}

export default Header;