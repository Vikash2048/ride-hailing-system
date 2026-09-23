#!/usr/bin/env python3
"""
Ride-hailing API test client.

A single CLI that hits every endpoint exposed by src/routes/*.js, plus a
"simulate-location" command that continuously updates a driver's position
so you can exercise the Redis GEOADD / GEOSEARCH matching path end to end.

Quick start
-----------
    pip install requests   # already installed in this environment

    # 1. create a rider + a driver
    python scripts/api_client.py create-user --name "Asha Rao" --phone 9990001111
    python scripts/api_client.py create-user --name "Ravi Driver" --phone 9990002222
    python scripts/api_client.py create-driver --user-id <driver-user-id>
    python scripts/api_client.py driver-online --driver-id <driver-id>

    # 2. start feeding it a moving location in one terminal
    python scripts/api_client.py simulate-location --driver-id <driver-id> \
        --center-lat 12.9716 --center-lng 77.5946 --interval 3

    # 3. in another terminal, request a ride
    python scripts/api_client.py create-ride --rider-id <rider-user-id> \
        --pickup-lat 12.9716 --pickup-lng 77.5946 \
        --dropoff-lat 12.9352 --dropoff-lng 77.6146

Every command prints the HTTP status and the JSON response so you can see
exactly what the API returned.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import requests

DEFAULT_BASE_URL = os.environ.get("RIDE_API_BASE_URL", "http://localhost:3000/api/v1")
EARTH_RADIUS_KM = 6371.0


# --------------------------------------------------------------------------- #
# HTTP client — one thin wrapper per endpoint in src/routes/
# --------------------------------------------------------------------------- #

class ApiError(Exception):
    pass


class RideHailingClient:
    def __init__(self, base_url: str = DEFAULT_BASE_URL, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()

    def _request(self, method: str, path: str, **kwargs):
        url = f"{self.base_url}{path}"
        try:
            resp = self.session.request(method, url, timeout=self.timeout, **kwargs)
        except requests.exceptions.RequestException as exc:
            raise ApiError(f"{method} {url} failed: {exc}") from exc

        try:
            body = resp.json()
        except ValueError:
            body = resp.text

        return resp.status_code, body

    # -- users -------------------------------------------------------------- #

    def create_user(self, name: str, phone: str, email: Optional[str] = None):
        payload = {"name": name, "phone": phone}
        if email:
            payload["email"] = email
        return self._request("POST", "/users", json=payload)

    # -- drivers -------------------------------------------------------------#

    def create_driver(self, user_id: str):
        return self._request("POST", "/drivers", json={"userId": user_id})

    def driver_online(self, driver_id: str):
        return self._request("POST", f"/drivers/{driver_id}/online")

    def driver_offline(self, driver_id: str):
        return self._request("POST", f"/drivers/{driver_id}/offline")

    def update_driver_location(self, driver_id: str, latitude: float, longitude: float):
        return self._request(
            "POST",
            f"/drivers/{driver_id}/location",
            json={"latitude": latitude, "longitude": longitude},
        )

    def find_nearby_drivers(self, latitude: float, longitude: float, radius_km: float):
        return self._request(
            "GET",
            "/drivers/nearby",
            params={"latitude": latitude, "longitude": longitude, "radius": radius_km},
        )

    # -- rides ---------------------------------------------------------------#

    def create_ride(
        self,
        rider_id: str,
        pickup_lat: float,
        pickup_lng: float,
        dropoff_lat: float,
        dropoff_lng: float,
        idempotency_key: Optional[str] = None,
    ):
        payload = {
            "riderId": rider_id,
            "pickup": {"latitude": pickup_lat, "longitude": pickup_lng},
            "dropoff": {"latitude": dropoff_lat, "longitude": dropoff_lng},
        }
        headers = {"Idempotency-Key": idempotency_key or str(uuid.uuid4())}
        return self._request("POST", "/rides", json=payload, headers=headers)

    def accept_ride(self, ride_id: str, driver_id: str):
        return self._request("POST", f"/rides/{ride_id}/accept", json={"driverId": driver_id})

    def reject_ride(self, ride_id: str, driver_id: str):
        return self._request("POST", f"/rides/{ride_id}/reject", json={"driverId": driver_id})

    def driver_arriving(self, ride_id: str, driver_id: str):
        return self._request("POST", f"/rides/{ride_id}/arriving", json={"driverId": driver_id})

    def start_ride(self, ride_id: str, driver_id: str):
        return self._request("POST", f"/rides/{ride_id}/start", json={"driverId": driver_id})

    def complete_ride(self, ride_id: str, driver_id: str):
        return self._request("POST", f"/rides/{ride_id}/complete", json={"driverId": driver_id})

    def cancel_ride(self, ride_id: str, rider_id: str):
        return self._request("POST", f"/rides/{ride_id}/cancel", json={"riderId": rider_id})

    def get_rides_by_rider(self, rider_id: str, page: int = 1, limit: int = 20):
        # NB: this is registered as POST in rideRoutes.js, not GET.
        return self._request(
            "POST", f"/rides/users/{rider_id}", params={"page": page, "limit": limit}
        )


# --------------------------------------------------------------------------- #
# Geo helpers for the location simulator
# --------------------------------------------------------------------------- #

def destination_point(lat: float, lng: float, bearing_deg: float, distance_km: float):
    """Move `distance_km` from (lat, lng) along `bearing_deg` (0 = north)."""
    lat1 = math.radians(lat)
    lng1 = math.radians(lng)
    brng = math.radians(bearing_deg)
    d_r = distance_km / EARTH_RADIUS_KM

    lat2 = math.asin(
        math.sin(lat1) * math.cos(d_r) + math.cos(lat1) * math.sin(d_r) * math.cos(brng)
    )
    lng2 = lng1 + math.atan2(
        math.sin(brng) * math.sin(d_r) * math.cos(lat1),
        math.cos(d_r) - math.sin(lat1) * math.sin(lat2),
    )
    return math.degrees(lat2), math.degrees(lng2)


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def bearing_to(lat1, lng1, lat2, lng2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lng2 - lng1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return math.degrees(math.atan2(x, y)) % 360


def parse_waypoints(raw: str):
    """'12.9716,77.5946 12.9352,77.6146' -> [(12.9716, 77.5946), (12.9352, 77.6146)]"""
    points = []
    for chunk in raw.split():
        lat_str, lng_str = chunk.split(",")
        points.append((float(lat_str), float(lng_str)))
    if len(points) < 2:
        raise ValueError("--waypoints needs at least two 'lat,lng' pairs")
    return points


# --------------------------------------------------------------------------- #
# Continuous location simulator
# --------------------------------------------------------------------------- #

def simulate_location(
    client: RideHailingClient,
    driver_id: str,
    mode: str,
    interval: float,
    speed_kmh: float,
    duration: Optional[float],
    center: Optional[tuple],
    radius_km: float,
    waypoints: Optional[list],
):
    """Continuously POSTs a moving position to /drivers/:driverId/location."""

    step_km = speed_kmh * (interval / 3600.0)
    started = time.monotonic()
    tick = 0

    if mode == "walk":
        lat, lng = center
        bearing = random.uniform(0, 360)
        print(
            f"[simulate-location] mode=walk center=({lat:.5f},{lng:.5f}) "
            f"radius={radius_km}km speed={speed_kmh}km/h interval={interval}s"
        )
    else:  # route
        lat, lng = waypoints[0]
        wp_index = 1
        direction = 1
        print(
            f"[simulate-location] mode=route waypoints={len(waypoints)} "
            f"speed={speed_kmh}km/h interval={interval}s"
        )

    print(f"[simulate-location] driver_id={driver_id} base_url={client.base_url}")
    print("[simulate-location] Ctrl+C to stop\n")

    try:
        while True:
            if duration is not None and (time.monotonic() - started) >= duration:
                print("[simulate-location] duration elapsed, stopping.")
                break

            if mode == "walk":
                # occasionally pick a new heading so the path looks organic
                if tick % 4 == 0:
                    bearing = (bearing + random.uniform(-60, 60)) % 360
                lat, lng = destination_point(lat, lng, bearing, step_km)
                # if we've drifted outside the radius, turn back toward center
                if haversine_km(lat, lng, *center) > radius_km:
                    bearing = bearing_to(lat, lng, *center)
                    lat, lng = destination_point(lat, lng, bearing, step_km)
            else:
                target_lat, target_lng = waypoints[wp_index]
                remaining = haversine_km(lat, lng, target_lat, target_lng)
                if remaining <= step_km:
                    lat, lng = target_lat, target_lng
                    wp_index += direction
                    if wp_index >= len(waypoints):
                        direction = -1
                        wp_index = len(waypoints) - 2
                    elif wp_index < 0:
                        direction = 1
                        wp_index = 1
                else:
                    brng = bearing_to(lat, lng, target_lat, target_lng)
                    lat, lng = destination_point(lat, lng, brng, step_km)

            timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
            try:
                status, body = client.update_driver_location(driver_id, lat, lng)
                ok = "OK" if status < 300 else "ERR"
                print(f"[{timestamp}] {ok} {status}  lat={lat:.6f} lng={lng:.6f}  -> {body}")
            except ApiError as exc:
                print(f"[{timestamp}] ERR  {exc}")

            tick += 1
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[simulate-location] stopped by user.")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def print_result(status: int, body):
    print(f"HTTP {status}")
    if isinstance(body, (dict, list)):
        print(json.dumps(body, indent=2))
    else:
        print(body)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Test client for the ride_hailing_system API (users, drivers, rides).",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"API base URL (default: {DEFAULT_BASE_URL}, or set RIDE_API_BASE_URL)",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # users
    p = sub.add_parser("create-user", help="POST /users")
    p.add_argument("--name", required=True)
    p.add_argument("--phone", required=True)
    p.add_argument("--email")

    # drivers
    p = sub.add_parser("create-driver", help="POST /drivers")
    p.add_argument("--user-id", required=True)

    p = sub.add_parser("driver-online", help="POST /drivers/:driverId/online")
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("driver-offline", help="POST /drivers/:driverId/offline")
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("update-location", help="POST /drivers/:driverId/location (single update)")
    p.add_argument("--driver-id", required=True)
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lng", type=float, required=True)

    p = sub.add_parser("nearby-drivers", help="GET /drivers/nearby")
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lng", type=float, required=True)
    p.add_argument("--radius", type=float, default=5, help="km, default 5")

    # rides
    p = sub.add_parser("create-ride", help="POST /rides")
    p.add_argument("--rider-id", required=True)
    p.add_argument("--pickup-lat", type=float, required=True)
    p.add_argument("--pickup-lng", type=float, required=True)
    p.add_argument("--dropoff-lat", type=float, required=True)
    p.add_argument("--dropoff-lng", type=float, required=True)
    p.add_argument("--idempotency-key", help="default: a fresh random UUID")

    p = sub.add_parser("accept-ride", help="POST /rides/:rideId/accept")
    p.add_argument("--ride-id", required=True)
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("reject-ride", help="POST /rides/:rideId/reject")
    p.add_argument("--ride-id", required=True)
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("driver-arriving", help="POST /rides/:rideId/arriving")
    p.add_argument("--ride-id", required=True)
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("start-ride", help="POST /rides/:rideId/start")
    p.add_argument("--ride-id", required=True)
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("complete-ride", help="POST /rides/:rideId/complete")
    p.add_argument("--ride-id", required=True)
    p.add_argument("--driver-id", required=True)

    p = sub.add_parser("cancel-ride", help="POST /rides/:rideId/cancel")
    p.add_argument("--ride-id", required=True)
    p.add_argument("--rider-id", required=True)

    p = sub.add_parser("ride-history", help="POST /rides/users/:riderId")
    p.add_argument("--rider-id", required=True)
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--limit", type=int, default=20)

    # the main event: continuous location updates
    p = sub.add_parser(
        "simulate-location",
        help="Continuously update a driver's location (walk around a point, or follow a route)",
    )
    p.add_argument("--driver-id", required=True)
    p.add_argument("--mode", choices=["walk", "route"], default="walk")
    p.add_argument("--interval", type=float, default=3.0, help="seconds between updates (default 3)")
    p.add_argument("--speed-kmh", type=float, default=30.0, help="simulated travel speed (default 30)")
    p.add_argument("--duration", type=float, help="stop after N seconds (default: run until Ctrl+C)")
    # walk mode
    p.add_argument("--center-lat", type=float, help="walk mode: center latitude")
    p.add_argument("--center-lng", type=float, help="walk mode: center longitude")
    p.add_argument("--radius-km", type=float, default=2.0, help="walk mode: wander radius (default 2km)")
    # route mode
    p.add_argument(
        "--waypoints",
        help='route mode: space-separated "lat,lng" pairs, e.g. "12.9716,77.5946 12.9352,77.6146"',
    )

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    client = RideHailingClient(base_url=args.base_url)

    try:
        if args.command == "create-user":
            print_result(*client.create_user(args.name, args.phone, args.email))

        elif args.command == "create-driver":
            print_result(*client.create_driver(args.user_id))

        elif args.command == "driver-online":
            print_result(*client.driver_online(args.driver_id))

        elif args.command == "driver-offline":
            print_result(*client.driver_offline(args.driver_id))

        elif args.command == "update-location":
            print_result(*client.update_driver_location(args.driver_id, args.lat, args.lng))

        elif args.command == "nearby-drivers":
            print_result(*client.find_nearby_drivers(args.lat, args.lng, args.radius))

        elif args.command == "create-ride":
            print_result(
                *client.create_ride(
                    args.rider_id,
                    args.pickup_lat,
                    args.pickup_lng,
                    args.dropoff_lat,
                    args.dropoff_lng,
                    args.idempotency_key,
                )
            )

        elif args.command == "accept-ride":
            print_result(*client.accept_ride(args.ride_id, args.driver_id))

        elif args.command == "reject-ride":
            print_result(*client.reject_ride(args.ride_id, args.driver_id))

        elif args.command == "driver-arriving":
            print_result(*client.driver_arriving(args.ride_id, args.driver_id))

        elif args.command == "start-ride":
            print_result(*client.start_ride(args.ride_id, args.driver_id))

        elif args.command == "complete-ride":
            print_result(*client.complete_ride(args.ride_id, args.driver_id))

        elif args.command == "cancel-ride":
            print_result(*client.cancel_ride(args.ride_id, args.rider_id))

        elif args.command == "ride-history":
            print_result(*client.get_rides_by_rider(args.rider_id, args.page, args.limit))

        elif args.command == "simulate-location":
            waypoints = parse_waypoints(args.waypoints) if args.waypoints else None
            center = None
            if args.mode == "walk":
                if args.center_lat is None or args.center_lng is None:
                    parser.error("--mode walk requires --center-lat and --center-lng")
                center = (args.center_lat, args.center_lng)
            else:
                if not waypoints:
                    parser.error("--mode route requires --waypoints")

            simulate_location(
                client=client,
                driver_id=args.driver_id,
                mode=args.mode,
                interval=args.interval,
                speed_kmh=args.speed_kmh,
                duration=args.duration,
                center=center,
                radius_km=args.radius_km,
                waypoints=waypoints,
            )

    except ApiError as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
