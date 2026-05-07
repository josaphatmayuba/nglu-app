import { PulseLoader } from "react-spinners";

export default function LoaderSpinner() {
  return (
    <div className='h-screen w-screen flex items-center justify-center'>
      <PulseLoader color='#4F46E5' />
    </div>
  );
}
