import React from 'react'
import {Card, CardHeader, CardBody, CardFooter, Divider, Link, Image} from "@nextui-org/react";

function DataList() {
  return (
    <Card className="max-w-[400px] rounded-md">
      <CardHeader className="flex gap-3">
        <Image
          alt="nextui logo"
          height={40}
          radius="sm"
          src="https://avatars.githubusercontent.com/u/86160567?s=200&v=4"
          width={40}
        />
        <div className="flex flex-col">
          <p className="text-md m-0">NextUI</p>
          <p className="text-small text-default-500 m-0">nextui.org</p>
        </div>
      </CardHeader>
      <Divider className='m-0' />
      <CardBody>
        <p>Make beautiful websites regardless of your design experience.</p>
      </CardBody>
      <Divider  className='m-0' />
      <CardFooter>
        <Link
          isExternal
          showAnchorIcon
          href="https://github.com/nextui-org/nextui"
        >
          Go to
        </Link>
      </CardFooter>
    </Card>
  )
}

export default DataList;