import Hero from "./Hero";
import JustForYou from "./JustForYou";
import NewProducts from "./NewProducts";
import Trending from "./Trending";

export default function Home() {
  return (
    <div>
      <Hero />
      <Trending />
      <NewProducts/>
      <JustForYou/>
    </div>
  );
}
