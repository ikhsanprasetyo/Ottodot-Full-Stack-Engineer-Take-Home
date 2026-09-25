'use client';

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-24">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-green-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute top-2/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl"></div>

        <div
          className="absolute inset-0 bg-[radial-gradient(#232323_1px,transparent_1px)] opacity-20"
          style={{
            backgroundSize: '30px 30px'
          }}
        ></div>

        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent_1px,rgba(0,255,0,0.05)_1px,transparent_2px)] opacity-30"
          style={{
            backgroundSize: '100% 4px'
          }}
        ></div>
      </div>
    </section>
  );
};
