import { useEffect } from "react";
import toast from "react-hot-toast";

function CustomerLogout(props) {
	useEffect(() => {
		// dont clear local storage
		localStorage.clear();

		// delevioletlCookies();
		toast.success("Logged Out");
		// localStorage.setItem("isLogged", false);;

		window.location.href = "/customer/login";
	}, []);
}
export default CustomerLogout;
