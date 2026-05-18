import { Eye } from "lucide-react";
import React from "react";

const ViewBtnOnly = () => {
	return (
		<div className='flex justify-center items-center bg-brand-600 hover:bg-brand-700 text-white py-2 px-3 rounded-lg mr-2 transition shadow-sm'>
			<Eye className="w-4 h-4" />
		</div>
	);
};

export default ViewBtnOnly;
