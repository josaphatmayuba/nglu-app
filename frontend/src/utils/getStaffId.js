import jwtDecode from "jwt-decode";
import { getAccessToken } from "./tokenStore";

const getStaffId = () => {
	// SCRUM-119 — token en mémoire (fallback localStorage pour le flux client legacy).
	const token = getAccessToken() || localStorage.getItem("access-token");

	if (token) {
		const id = jwtDecode(token)?.sub;
		return id;
	}

	// Au tout début du chargement, le token mémoire peut ne pas être encore
	// restauré : on retombe sur l'id non-secret conservé en localStorage.
	const storedId = localStorage.getItem("id");
	return storedId ? Number(storedId) : undefined;
};

export default getStaffId;
