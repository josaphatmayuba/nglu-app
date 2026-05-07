import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { addCustomerGoogle } from "../../redux/rtk/features/eCommerce/customer/customerSlice";

const GoogleLoginButton = () => {
  const dispatch = useDispatch();

  return (
    <div className='flex items-center justify-center p-3'>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_APP_GOOGLE_CLIENT_ID}>
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              const data = await dispatch(
                addCustomerGoogle(credentialResponse)
              );
              if (data.payload.message === "success") {
                window.location.href = "/";
              }
            } catch (err) {}
          }}
          onError={() => {
            console.log("Login Failed");
          }}
          useOneTap={false}
        />
      </GoogleOAuthProvider>
    </div>
  );
};

export default GoogleLoginButton;
