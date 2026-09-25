'use client';
import React from 'react';
import { StarHalf, StarIcon } from 'lucide-react';
export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Bambang Kurniwanto',
      game: 'GTA V',
      rating: 3.5,
      text: 'I have been using Byteseeker for 6 months now. Zero bans, smooth performance, and the aimbot is so customizable it looks completely natural.'
    }
  ];

  return (
    <section className="py-20 relative bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full filter blur-3xl"></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            User Testimonials
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-cyan-500 mx-auto mb-6"></div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Don&apos;t just take our word for it. Here&apos;s what our community
            has to say about Byteseeker.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20 rounded-sm p-6 relative group"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex items-center mb-4">
                <div className="flex space-x-1">
                  {[...Array(Math.ceil(testimonial.rating))].map((_, i) => {
                    const isHalf = testimonial.rating % 1 === 0.5;
                    const floorNumber = Math.floor(testimonial.rating);

                    if (floorNumber === i && isHalf) {
                      return (
                        <StarHalf
                          key={`half-${i}`} // ✅ Key ditambahkan
                          className={`w-4 h-4 ${i < testimonial.rating ? 'text-green-400' : 'text-gray-600'}`}
                          fill={
                            i < testimonial.rating ? 'currentColor' : 'none'
                          }
                        />
                      );
                    }
                    return (
                      <StarIcon
                        key={`star-${i}`} // ✅ Key ditambahkan
                        className={`w-4 h-4 ${i < testimonial.rating ? 'text-green-400' : 'text-gray-600'}`}
                        fill={i < testimonial.rating ? 'currentColor' : 'none'}
                      />
                    );
                  })}
                </div>
              </div>
              <p className="text-gray-300 mb-6 italic">
                &quot;{testimonial.text}&quot;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">
                    {testimonial.game} Player
                  </p>
                </div>
                <div className="w-2 h-8 bg-gradient-to-b from-green-400 to-cyan-500"></div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
