import Dashboard from "@/components/Dashboard/Graph/Dashboard";
import GetAllDeliveryBoy from "@/components/DeliveryBoy/GetAllDeliveryBoy";
import GetAllEmailConfig from "@/components/EmailConfig/GetAllEmailConfig";
import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllCurrency from "@/components/eComErp/Currency/GetAllCurrency";
import GetAllDeliveryFee from "@/components/eComErp/DeliveryFee/GetAllDeliveryFee";
import GetAllDiscount from "@/components/eComErp/Discount/GetAllDiscount";
import GetAllSlider from "@/components/eComErp/Slider/GetAllSlider";
import Logout from "@/components/user/Logout";
import { Route, Routes } from "react-router-dom";

export default function CommonRoutes() {
  return (
    <Routes>
      <Route
        path='/email-config'
        exact
        element={
          <PermissionChecker permission={"readAll-emailConfig"}>
            <GetAllEmailConfig />
          </PermissionChecker>
        }
      />
      <Route
        path='/slider'
        element={
          <PermissionChecker permission={"readAll-sliderImages"}>
            <GetAllSlider />
          </PermissionChecker>
        }
      />

      <Route path='/delivery-boy' element={<GetAllDeliveryBoy />} />
      <Route
        path='/delivery-fee'
        element={
          <PermissionChecker permission={"readAll-deliveryFee"}>
            <GetAllDeliveryFee />
          </PermissionChecker>
        }
      />
      <Route
        path='/discount'
        element={
          <PermissionChecker permission={"readAll-discount"}>
            <GetAllDiscount />
          </PermissionChecker>
        }
      />

      <Route
        path='/currency'
        element={
          <PermissionChecker permission={"readAll-currency"}>
            <GetAllCurrency />
          </PermissionChecker>
        }
      />

      <Route path='/auth/logout' exact element={<Logout />} />
      <Route path='/dashboard' element={<Dashboard />}></Route>
      <Route path='/' element={<Dashboard />} />
      {/* <Route path='/*' element={<Page404 />} /> */}
    </Routes>
  );
}
