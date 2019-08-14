export function addDays(date, ndays) {
    /*
    Input a javascript date object
    Return date object ndays days into the future
    */
    var result = new Date(date);
    result.setDate(result.getDate() + ndays);
    return result;
}

export function daySpacedDateRange(dateStart, dateEnd) {
    /*
    Return a list containing all days from dateStart to dateEnd (inclusive bounds) 
    one day at a time. 
    */  
    let range = []; 
    while (dateStart < dateEnd) {
      range.push(dateStart); 
      dateStart = addDays(dateStart, 1); 
    }
    range.push(dateEnd); 
    return range; 
}

export function multiSampleRandomUniform(low, high, num_samples) {
    /*
    Sample num_samples numerical values from a uniform distribution
    -   If no low and high values defining range of uniform are specified, 
        defaults to the standard uniform [0, 1] 
    -   If no quantity of samples is specified, 
        take a single sample 
    */ 
    if (!low) low = 0.;
    if (!high) high = 1.; 
    if (!num_samples) num_samples = 1; 
    let samples = []; 
    for (let i = 0; i < num_samples; i++) samples.push([Math.random() * 360 - 180, 
                                                        Math.random() * 180 - 90]); 
    return samples;
}