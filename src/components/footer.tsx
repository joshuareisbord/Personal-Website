import SECTIONS from "../constants/sections";

export const Footer: React.FC = () => {
  return (
    <section className="bg-gray-900" id={SECTIONS.FOOTER}>
      <div className="flex w-full">
        <div className="w-1/3 flex">
          <div className="w-1/3 py-1 bg-green-400"></div>
          <div className="w-1/3 py-1 bg-green-500"></div>
          <div className="w-1/3 py-1 bg-green-600"></div>
        </div>
        <div className="w-1/3 flex">
          <div className="w-1/3 py-1 bg-green-400"></div>
          <div className="w-1/3 py-1 bg-green-500"></div>
          <div className="w-1/3 py-1 bg-green-600"></div>
        </div>
        <div className="w-1/3 flex">
          <div className="w-1/3 py-1 bg-green-400"></div>
          <div className="w-1/3 py-1 bg-green-500"></div>
          <div className="w-1/3 py-1 bg-green-600"></div>
        </div>
      </div>
      <div className="container mx-auto px-4">
        <div className="pt-10 pb-3">
          <div className="relative lg:pb-8 mb-2 flex flex-wrap lg:border-b lg:border-gray-800">
            <p className="w-full lg:w-auto text-gray-400 text-sm text-center lg:text-left order-last lg:order-first">© 2022. All rights reserved.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Footer;
