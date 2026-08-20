"use client";

// React, Next.js
import { useEffect, useState } from "react";
import Image from "next/image";

// Cloudinary
import { CldUploadWidget } from "next-cloudinary";
import { Button } from "@/components/ui/button";
import { Trash, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
  value: string[];
  type: "standard" | "profile" | "cover";
  dontShowPreview?: boolean;
  error?: boolean;
  cloudinary_key?: string;
}

const ImageUpload = ({
  disabled,
  onChange,
  onRemove,
  value,
  type,
  dontShowPreview,
  error,
  cloudinary_key = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET,
}: ImageUploadProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false); // Add state for bounce
  const [isUploading, setIsUploading] = useState(false); // track upload start
  const [hideModal, setHideModal] = useState(false); // hide modal

  useEffect(() => {
    if (error) {
      setIsBouncing(true);
      const timer = setTimeout(() => {
        setIsBouncing(false); // Stop the bounce after 1 and half second
      }, 1500);
      return () => clearTimeout(timer); // Clean up timer if the component unmounts or error changes
    }
  }, [error]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (!cloudinary_key) {
    // This is the error! Return null or throw a helpful error if it's missing.
    console.error(
      "Cloudinary Upload Preset is missing! Check .env.local for NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
    return null;
  }

  const onUpload = (result: { info?: { secure_url?: string } | string }) => {
    if (typeof result.info === "object" && result.info?.secure_url) {
      onChange(result.info.secure_url);
    }
  };

  const widgetOptions = {
    uploadPreset: cloudinary_key,

    options: {
      styles: {
        palette: {
          window: "#FFFFFF",
          windowBorder: "#90A0B3",
          tabIcon: "#0078FF",
          menuIcons: "#5A616A",
          textDark: "#000000",
          textLight: "#FFFFFF",
          link: "#0078FF",
          action: "#0078FF",
          inactiveTabIcon: "#0E2F5A",
          error: "#F44235",
          inProgress: "#0078FF",
          complete: "#20B832",
          sourceBg: "#E4EBF1",
        },
        frame: {
          background: "#FEFEFE",
        },
        toolbar: {
          background: "#FFFFFF",
        },
      },
    },
  };

  if (type === "profile") {
    return (
      <CldUploadWidget
        onSuccess={onUpload}
        onClose={() => {
          setIsUploading(false);
          setHideModal(false);
          if (typeof document !== "undefined") {
            document.body.style.pointerEvents = "auto";
            document.body.style.overflow = "auto";
          }
        }}
        uploadPreset={cloudinary_key}
        options={{
          styles: {
            frame: {
              background: "#FFFFFF",
            },
          },
        }}
      >
        {({ open }) => {
          const onClick = () => {
            setTimeout(() => {
              open();
            }, 200);
          };

          return (
            <div
              className={cn(
                "relative rounded-full w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 bg-gray-200 dark:bg-gray-800 border-2 border-white dark:border-gray-700 shadow-2xl overflow-visible cursor-pointer group transition-transform duration-300 ease-bezier-1 ease-in-out hover:scale-105 will-change-transform",
                {
                  "bg-red-100 dark:bg-red-900/30": error,
                  "animate-pulse": isBouncing,
                },
              )}
              onClick={onClick}
            >
              {value.length > 0 ? (
                <Image
                  src={value[0]}
                  alt="Variant image"
                  width={300}
                  height={300}
                  className="w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-full object-cover absolute top-0 left-0 bottom-0 right-0"
                />
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full">
                  <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.5] group-hover:scale-110 transition-transform duration-300 ease-bezier-1 ease-in-out" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Upload Image
                  </span>
                </div>
              )}

              <button
                type="button"
                className="z-20 absolute right-0 bottom-2 sm:bottom-6 flex items-center font-medium text-[17px] h-10 w-10 sm:h-14 sm:w-14 justify-center text-white bg-gradient-to-t from-blue-500 to-blue-300 border-none shadow-lg rounded-full hover:shadow-md active:shadow-sm cursor-pointer hover:scale-110 transition-transform duration-300 ease-bezier-1 ease-in-out will-change-transform"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <svg
                  viewBox="0 0 640 512"
                  fill="white"
                  height="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z" />
                </svg>
              </button>
            </div>
          );
        }}
      </CldUploadWidget>
    );
  } else if (type === "cover") {
    return (
      <div
        className={cn(
          "relative w-full h-[200px] sm:h-[280px] md:h-[348px] bg-gray-100 rounded-lg bg-gradient-to-b from-gray-100 via-gray-100 to-gray-400 overflow-hidden",
          {
            "from-red-100 to-red-200 ": error,
            "animate-bounce": isBouncing,
          },
        )}
      >
        {value.length > 0 && (
          <Image
            src={value[0]}
            alt=""
            width={1200}
            height={1200}
            className="w-full h-full rounded-lg object-cover"
          />
        )}
        <CldUploadWidget
          onSuccess={onUpload}
          onClose={() => {
            setIsUploading(false);
            setHideModal(false);
            if (typeof document !== "undefined") {
              document.body.style.pointerEvents = "auto";
              document.body.style.overflow = "auto";
            }
          }}
          uploadPreset={cloudinary_key}
          options={{
            styles: {
              frame: {
                background: "#FFFFFF",
              },
            },
          }}
        >
          {({ open }) => {
            const onClick = () => {
              setTimeout(() => {
                open();
              }, 200);
            };

            return (
              <button
                type="button"
                className="absolute bottom-4 right-4 flex items-center font-medium text-[17px] py-3 px-6 text-white bg-gradient-to-t from-blue-500 to-blue-300 border-none shadow-lg rounded-full hover:shadow-md active:shadow-sm cursor-pointer"
                disabled={disabled}
                onClick={onClick}
              >
                <svg
                  viewBox="0 0 640 512"
                  fill="white"
                  height="1em"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2"
                >
                  <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z" />
                </svg>
                <span>
                  {value.length > 0 ? "Change cover" : "Upload a cover"}
                </span>
              </button>
            );
          }}
        </CldUploadWidget>
      </div>
    );
  } else {
    return (
      <div>
        <div className="mb-4 flex items-center gap-4">
          {value.length > 0 &&
            !dontShowPreview &&
            value.map((imageUrl) => (
              <div
                key={imageUrl}
                className="relative w-[200px] min-h-[100px] max-h-[200px]"
              >
                {/* Delete image btn */}
                <div className="z-10 absolute top-2 right-2">
                  <Button
                    onClick={() => onRemove(imageUrl)}
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="rounded-full"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
                {/* Image */}
                <Image
                  fill
                  className="object-cover rounded-md"
                  alt=""
                  src={imageUrl}
                />
              </div>
            ))}
        </div>
        <CldUploadWidget
          onSuccess={(result) => {
            setIsUploading(false); // done uploading
            setHideModal(false); // hide modal
            onUpload(result);
          }}
          onClose={() => {
            setIsUploading(false);
            setHideModal(false);
            if (typeof document !== "undefined") {
              document.body.style.pointerEvents = "auto";
              document.body.style.overflow = "auto";
            }
          }}
          uploadPreset={cloudinary_key}
        >
          {({ open }) => {
            const handleUploadClick = () => {
              setIsUploading(true);
              setHideModal(true);
              open();
            };

            return (
              <>
                <button
                  type="button"
                  className="flex items-center font-medium text-[17px] py-3 px-6 text-white bg-gradient-to-t from-blue-500 to-blue-300 border-none shadow-lg rounded-full hover:shadow-md active:shadow-sm cursor-pointer"
                  disabled={disabled}
                  onClick={handleUploadClick}
                >
                  <svg
                    viewBox="0 0 640 512"
                    fill="white"
                    height="1em"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-2"
                  >
                    <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z" />
                  </svg>
                  <span>Upload images</span>
                </button>
              </>
            );
          }}
        </CldUploadWidget>
      </div>
    );
  }
};

export default ImageUpload;
