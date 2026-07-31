import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function EmptyCart() {
  return (
    <div className="mx-auto w-full bg-f5 px-4 text-center text-main-primary">
      <div className="min-h-[calc(100vh-65px)] pb-14 flex flex-col justify-center items-center">
        <Image
          src="/assets/images/cart.avif"
          alt="Cart image"
          width={300}
          height={300}
          className="w-64 h-64"
        />
        <span className="py-4 font-bold my-3">
          No items yet? Continue shopping to explore more.
        </span>
        <Button asChild size="lg" className="w-56 rounded-full">
          <Link href="/browse">Explore items</Link>
        </Button>
      </div>
    </div>
  );
}
