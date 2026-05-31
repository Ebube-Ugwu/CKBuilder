import {Link} from "@tanstack/react-router";
import {FaHome, FaLock, FaPiggyBank} from "react-icons/fa";
import {MdSettings} from "react-icons/md";

const NavigationMenu = () => {
    return (
        <div className="flex flex-col gap-4 p-4 items-center">
            <hr className="mx-4 text-foreground opacity-80 w-10/12"/>
            <nav
                className="flex flex-row text-2xl w-10/12 justify-around text-foreground items-center gap-20 ">
                <Link to="/" className="drop-shadow-2xl opacity-75 text-foreground" activeOptions={{exact: true}}
                      activeProps={{className: "opacity-100 text-yellow-400"}}><FaHome/></Link>
                <Link to="/new" className="drop-shadow-2xl opacity-75 text-foreground"
                      activeOptions={{exact: true}} activeProps={{className: "opacity-100 text-yellow-400"}}><FaPiggyBank/></Link>
                <Link to="/locks" className="drop-shadow-2xl opacity-75 text-foreground" activeOptions={{exact: true}}
                      activeProps={{className: "opacity-100 text-yellow-400"}}><FaLock/></Link>
                <Link to="/settings" className="drop-shadow-2xl opacity-75 text-foreground" activeOptions={{exact: true}}
                      activeProps={{className: "opacity-100 text-yellow-400"}}><MdSettings/></Link>
            </nav>
        </div>
    );
}
export default NavigationMenu;