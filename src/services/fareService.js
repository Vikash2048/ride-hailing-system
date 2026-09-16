const calculateFare = async (fare) => {
    //temporary fixed-distance calculation
    const baseFare = 50;
    const perkm = 15;

    // for now assume 10km
    const distanceKm = 10;
    return baseFare + (distanceKm * perkm);
};

export default { calculateFare };