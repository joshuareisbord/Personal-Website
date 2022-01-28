import SECTIONS from "../constants/sections";

export const Footer: React.FC = () => {
    return (
        <section className="bg-gray-900" id={SECTIONS.FOOTER}>
            <div className="flex flex-col items-center justify-center mx-auto px-4 h-20">
                <div className="pt-3 pb-3">
                    <div className="relative mx-2 flex flex-wrap lg:border-gray-800">
                        <p className="w-full text-gray-400 text-sm text-center">
                            © 2022. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Footer;
