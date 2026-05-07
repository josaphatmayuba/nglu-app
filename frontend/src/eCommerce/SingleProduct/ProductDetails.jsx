export default function ProductDetails({ description }) {
  return (
    <div className="productDescription">
      <h1 className="text-xl font-medium p-2">Product Details</h1>
      <div className="bg-white p-5">
        {<p dangerouslySetInnerHTML={{ __html: description }}></p> || (
          <>
            Mini Data Cable Set Storage Box 60w Quick Charge Multi Function Data
            Cable Mobile Phone Holder Storage Box • 60W Quick Charge :Charge
            your devices quickly with the 60W quick charge feature. •
            Multi-Function Data Cable :This data cable can be used for multiple
            purposes, making it a versatile accessory. • Type-C Connector :The
            Type-C connector ensures compatibility with a wide range of devices.
            • CE Certification :The product has been certified by CE, ensuring
            its safety and quality. • 60W Quick Charge :Charge your devices
            quickly with the 60W quick charge feature. • Multi-functional :This
            data cable set storage box is not just for cables, but also has a
            mobile phone holder for added convenience. • Type-C Connector :The
            Type-C connector ensures fast and stable data transfer between your
            devices. • CE Certification :This product has been certified by CE,
            ensuring its safety and quality. Features: Product Name: 60W
            multifunctional fast charge data cable storage box Transmission
            rate: 480Mbps Product material: PVC + ABS Product color: blue
            Product Size: 82.5mm long 10mm high Notices: This product does not
            include a phone card
          </>
        )}
      </div>
    </div>
  );
}
