import { cibGithub } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import React from 'react'

function Portfolio() {
  return (
    <div>
      <div>Hey, I'm Raj. I'm looking for a SDE role for modern web development profile. Which company likely to work on new technology like React, tailwind, NextJS etc.</div>
      <div className='flex justify-evenly items-center my-8'>
        {/* Image */}
        <div className='rounded-full w-[256px] h-[256px]'>
        <img src='' alt='' className=''/>
        </div>
        
        {/* Social media  infos */}
        <div className='flex flex-col justify-evenly items-center h-[250px]'>
          <div className='flex'>
            {/* icon */}
            <CIcon icon={cibGithub} className='w-[50px]'/>
            {/* text */}
            <div className='text-lg'>
                Tweet me fsdfdsjfklsdjfklsd fjdskfjasdkf jasdklfjds fjdksf 
            </div>
          </div>
          <div className='flex justify-evensly items-center'>
            {/* icon */}
            <CIcon icon={cibGithub} className='w-[50px]'/>
            {/* text */}
            <div className='flex justify-center items-center text-lg'>
                Tweet me fsdfdsjfklsdjfklsd fjdskfjasdkf jasdklfjds fjdksf 
            </div>
          </div>
          <div className='flex'>
            {/* icon */}
            <CIcon icon={cibGithub} className='w-[50px]'/>
            {/* text */}
            <div className='text-lg'>
                Tweet me fsdfdsjfklsdjfklsd fjdskfjasdkf jasdklfjds fjdksf 
            </div>
          </div>
          
        </div>
        
      </div>
      <div className='text-3xl font-bold underline'>
          Summary, Add Domain KNowledge
        </div>
    </div>
  )
}

export default Portfolio;