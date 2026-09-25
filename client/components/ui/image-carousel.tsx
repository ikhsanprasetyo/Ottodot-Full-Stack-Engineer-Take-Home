'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import '../../app/styles/carousel.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <Carousel
        showThumbs={false}
        showStatus={false}
        infiniteLoop
        useKeyboardArrows
        dynamicHeight={false}
        className="rounded-sm overflow-hidden relative"
        showArrows={true}
        renderArrowPrev={(onClickHandler, hasPrev, label) =>
          hasPrev && (
            <button
              type="button"
              onClick={onClickHandler}
              title={label}
              className="absolute top-1/2 left-4 z-20 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-sm shadow-md transition"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )
        }
        renderArrowNext={(onClickHandler, hasNext, label) =>
          hasNext && (
            <button
              type="button"
              onClick={onClickHandler}
              title={label}
              className="absolute top-1/2 right-4 z-20 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-sm shadow-md transition"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )
        }
      >
        {images.map((url, index) => (
          <div
            key={index}
            onClick={() => setSelectedImage(url)}
            className="cursor-pointer"
          >
            <div className="relative h-64 md:h-96 w-full">
              <Image
                src={url}
                alt={`Image ${index + 1}`}
                fill
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </Carousel>

      {/* Popup (Modal) */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-[80vw] h-[80vh]">
            <Image
              src={selectedImage}
              alt="Selected"
              fill
              className="object-contain rounded-sm shadow-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImageCarousel;
