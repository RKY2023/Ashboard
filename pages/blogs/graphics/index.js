import React from "react";
import Image from 'next/image';

export default function () {
  return (
    <>
    <ul>
      <li>
        VSync
        <ul>
          <li>
            <dl>
              <dt>
              Adaptive VSync
              </dt>
              <dd>
              Nvidia improvement that watches the monitor’s max refresh rate. If the FPS of the game is equal to or higher than the refresh, VSync is enabled. If the FPS falls below, it’s disabled, thus preventing some input lag issues from arising.
              </dd>
            </dl>
          </li>
          <li>
            <dl>
              <dt>
              Fast Sync
              </dt>
              <dd>
              Fast Sync is a more advanced form of Adaptive VSync from Nvidia that enables VSync when necessary and adds in automatic triple buffering to pick the best frame data possible. It takes a lot of power to use but helps fix a lot of VSync issues as well.
              </dd>
            </dl>
          </li>
          <li>
            <dl>
              <dt>
              Enhanced Sync
              </dt>
              <dd>
              Enhanced Sync is AMD’s version of Fast Sync. It disables VSync when the frame rate drops below a monitor’s refresh rate to prevent related problems.
              </dd>
            </dl>
          </li>
        </ul>
      </li>
      GSync or FreeSync  is better than VSync
    </ul>
    </>
  ); 
}