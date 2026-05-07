import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import "./assets/styles/main.css";

import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import Page404 from "./components/404/404Page";
import LoaderSpinner from "./components/loader/LoaderSpinner";
import Login from "./components/user/Login";
import { getSetting } from "./redux/rtk/features/setting/settingSlice";
import ServerError from "./components/404/ServerError";
const CustomerLayout = lazy(() => import("@/layouts/CustomerLayout"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));

function App() {
  const { data, loading, error } = useSelector((state) => state?.setting) || {};
  const dispatch = useDispatch();

  useEffect(() => {
    if (!data && !loading && !error) {
      dispatch(getSetting());
    }
  }, [data, dispatch, error, loading]);

  // content render
  let content = null;
  if (loading) content = <LoaderSpinner />;
  else if (data && !loading) {
    content = (
      <Routes>
        <Route
          path="/*"
          element={
            <Suspense fallback={<LoaderSpinner />}>
              <CustomerLayout />
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<LoaderSpinner />}>
              <AdminLayout />
            </Suspense>
          }
        />

        <Route path="/admin/auth/login" exact element={<Login />} />
        <Route path="/*" element={<Page404 />} />
      </Routes>
    );
  } else if (error) {
    content = <ServerError/>;
  }

  return (
    <BrowserRouter>
      <Toaster position='top-center' reverseOrder={false} />

      {content}
    </BrowserRouter>
  );
}

export default App;
