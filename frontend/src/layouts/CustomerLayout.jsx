import Header from "../eCommerce/CommonSection/Header";
import Footer from "../eCommerce/CommonSection/Footer";
import CustomerRoutes from "./CustomerRoutes";

export default function CustomerLayout() {
  return (
    <div className='flex flex-col min-h-screen bg-[#F9FAFB]'>
      {/* <Header /> */}
      <main className='flex-grow'>
        <CustomerRoutes />
      </main>
      <Footer />
    </div>
  );
}
