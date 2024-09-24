import React from "react";
import {
  HiOutlineMenuAlt3,
  HiOutlineX,
  HiOutlineCreditCard,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
} from "react-icons/hi";

import { IoMdLogIn } from "react-icons/io";

import { TbSparkles } from "react-icons/tb";

import { FaArrowRight } from "react-icons/fa";
import bgImg from '../assets/dashBg.jpg';
// Steps data
const steps = [
  {
    number: 1,
    description: "Log in to the platform and go to 'Create Test'.",
  },
  {
    number: 2,
    description: "Describe how test questions needs to be generated",
  },
  {
    number: 3,
    description: "Click 'Generate Test' to create the test.",
  },
  {
    number: 4,
    description: "Take the test or share it via the generated link.",
  },
];



const Hero24 = () => {
  const styles = {
    container:
      "bg-gradient-to-b from-[#050A16] to-[#001325] overflow-hidden relative",
    header:
      "fixed inset-x-0 top-0 z-50 w-full backdrop-blur-md bg-black/50",
    headerContent: "px-4 mx-auto sm:px-6 lg:px-8",
    headerFlex: "flex items-center justify-between h-16 lg:h-20",
    logo: "w-auto h-8 mr-8",
    navLinks: "hidden lg:flex lg:items-center lg:justify-center lg:space-x-10",
    navLink:
      "text-base text-white transition-all duration-200 hover:text-opacity-80",
    actionBtns:
      "lg:flex lg:items-center lg:justify-end lg:space-x-6 sm:ml-auto",
    loginBtn:
      "hidden text-base text-white transition-all duration-200 lg:inline-flex hover:text-opacity-80",
    applyBtn:
      "inline-flex items-center justify-center px-3 sm:px-5 py-2.5 text-sm sm:text-base font-semibold transition-all duration-300 text-white bg-white/10 hover:bg-white/15 focus:bg-white/30 rounded-lg transform hover:scale-105 hover:shadow-lg",
    menuBtn:
      "inline-flex p-2 ml-1 text-white transition-all duration-200 rounded-md sm:ml-4 lg:hidden focus:bg-gray-800 hover:bg-gray-800",
    section:
      "relative pt-24 pb-10 sm:pt-32 sm:pb-16 lg:pb-24 bg-gradient-to-b from-[#000000] to-[#1a1a1a]", // Updated to a black dark gradient
    sectionContent:
      "px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 relative z-10",
    title: "text-3xl font-bold sm:text-6xl animate-slideUpFade",
    titleGradient:
      "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white",
    description:
     "mt-5 text-base text-white text-opacity-40 sm:text-l animate-slideUpFade delay-100",
    ctaBtn:
      "inline-flex items-center px-6 py-4 mt-8 font-semibold text-white transition-all duration-300 bg-blue-700 rounded-lg sm:mt-16 hover:bg-blue-800 focus:bg-blue-800 transform hover:scale-105 hover:shadow-xl",
    statsGrid:
      "grid grid-cols-1 px-20 mt-12 text-left gap-x-12 gap-y-8 sm:grid-cols-3 sm:px-0",
    statItem: "flex items-center animate-fadeInScale delay-200",
    statIcon:
      "w-8 h-8 text-[#4A90E2] transition-all duration-300 transform hover:scale-105",
    statText: "ml-3 text-sm text-white",
  };
  

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerFlex}>
            <div className="brandFont" style={{color:'white',fontSize:'2rem', opacity:'0.6'}}>ABYUDAY</div>
            {/* <div className={styles.navLinks}>
              <a href="#" title="Features" className={styles.navLink}>
                Features
              </a>
              <a href="#" title="Solutions" className={styles.navLink}>
                Solutions
              </a>
              <a href="#" title="Resources" className={styles.navLink}>
                Resources
              </a>
              <a href="#" title="Pricing" className={styles.navLink}>
                Pricing
              </a>
            </div> */}
            <div className={styles.actionBtns}>
             
              <a
                href="/login"
                title="Signup for free"
                className={styles.applyBtn}
                role="button"
              >
                Login <IoMdLogIn style={{marginLeft:'0.2rem'}}/>
              </a>
            </div>
            <button type="button" className={styles.menuBtn}>
              <HiOutlineMenuAlt3 className="block w-6 h-6" />
              <HiOutlineX className="hidden w-6 h-6" />
            </button>
          </div>
        </div>
      </header>
      <div  >
        <section className={styles.section} 
        style={{
          height: "100vh",
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage: `url(${bgImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        >
          <div className={styles.sectionContent} >
            <div className="max-w-2xl mx-auto text-center" >
              <h1 className={styles.title}>
                <span className={styles.titleGradient}>
                 <span className="brandFont" style={{fontSize:'5rem'}}>ABYUDAY <br></br>Generative-AI Examiner Platform</span>
                </span>
              </h1>
              <p className={styles.description}>
                Experience the Ultimate Platform for Creating GenAI Tests
              </p>
              <a
                href="/dashboard"
                title="Dashboard"
                className={styles.ctaBtn}
                role="button"
              >
                Dashboard
                <FaArrowRight className="w-6 h-6 ml-8 -mr-2" />
              </a>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <TbSparkles className={styles.statIcon} />
                  <p className={styles.statText}>
                    GenAI Integrated
                  </p>
                </div>
                <div className={styles.statItem}>
                  <HiOutlineCheckCircle className={styles.statIcon} />
                  <p className={styles.statText}>
                    Seamless Tests
                  </p>
                </div>
                <div className={styles.statItem}>
                  <HiOutlineLockClosed className={styles.statIcon} />
                  <p className={styles.statText}>
                    Secure and optimized
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Steps section below the hero */}
      <section className="py-12 bg-black sm:py-16 lg:py-20">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl xl:text-5xl font-pj">
              Steps to Create Gen-AI Test
            </h2>
            <p className="max-w-lg mx-auto mt-6 text-lg font-normal text-gray-400 font-pj">
              Maintain your path better with us
            </p>
          </div>

          <div className="max-w-xl mx-auto mt-12 sm:px-10">
            {steps.map((step, index) => (
              <div key={index} className="relative pb-10">
                {/* Vertical line connecting all boxes */}
                <span
                  className={`absolute w-px ${
                    index === steps.length - 1 ? "h-0" : "h-full"
                  } bg-gray-700 left-12 top-0`}
                  aria-hidden="true"
                ></span>

                <div className="relative p-5 overflow-hidden bg-black border border-gray-700 rounded-2xl">
                  <div className="flex items-start sm:items-center">
                    <div className="inline-flex items-center justify-center flex-shrink-0 text-xl font-bold text-white bg-gray-800 w-14 h-14 rounded-xl font-pj">
                      {step.number}
                    </div>
                    <p className="ml-6 text-xl font-medium text-gray-200 font-pj">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero24;
