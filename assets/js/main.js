// convenience cache
R = {
    query: '',
    filters: [], // quick and dirty to implement compilation with simple .join()
    pages: 1,
    increment: 10
};

$(function () {
    // initialize API surface
    var client = algoliasearch('S4LNH5OS8A', '4d0df2379cbd3102de0e8edda8b630d8');
    var index = client.initIndex('dev_restaurants');
    var algoliaHelper = algoliasearchHelper(client, 'dev_restaurants', {
        index: 'dev_restaurants',
        facets: ['food_type']
    });
    
    // UI visual updates
    var ui_update = function (content) {
        if (typeof(content) != 'undefined') {
            var result_stats_quantity = content.nbHits;
            var result_stats_time = content.processingTimeMS * 0.001;
        } else {
            var result_stats_quantity = 'N/A';
            var result_stats_time = 'N/A';
        }
        var result_stats_quantity = `${result_stats_quantity} results found`;
        var result_stats_time = `in ${result_stats_time} seconds`;
    
        $('.result_stats_quantity').text(result_stats_quantity);
        $('.result_stats_time').text(result_stats_time);
        
        $('.restaurant_listings .clone').remove();
        content.hits.forEach(function (hit) {
            var $clone = $('.template').clone().removeClass('template').addClass('clone');
            $clone.find('.reviews').text('('+hit.reviews_count+' reviews)'); // yeah, what if it's singular
            $clone.find('.rating').text(hit.stars_count);
            $clone.find('.name').text(hit.name);
            $clone.find('.cuisine').text(hit.food_type);
            $clone.find('.location').text(hit.neighborhood);
            $clone.find('.photo').append('<img src="'+hit.image_url+'" />');
            $clone.find('.stars_yellow').css('width', hit.stars_count*20+'%');
            $clone.find('.price').text(hit.price_range);
            $('.restaurant_listings').append($clone);
        });
        
        // console.log(content.nbHits, content.hitsPerPage);
        if (content.nbHits <= content.hitsPerPage) {
            $('#more').hide();
        } else {
            $('#more').show();
        }
        
        // this should not clear out all the counts to zero upon filtering, but this would require caching facet counts so that we can use the old ones on all non filtering UI updates, but then when we change a filter with a given text query, to get the facet counts for the query without that filter applied also...tricky logic and would need to be thought out carefully
        if (content.facets.length) {
            $('.food_type li').each(function (index, element) {
                var coarse_facet_name = $(element).find('.name').text();
                var count = coarse_facet_count(content.facets[0].data, coarse_facet_name);
                $(element).find('.count').text(count);
            });
        } else {
            $('.food_type li').each(function (index, element) {
                $(element).find('.count').text('0');
            });
        }
    }
    
    // utility to come up with counts for food type categories
    var coarse_facet_count = function (facet_counts, coarse_facet_name) {
        var count = 0;
        coarse_facet_name = coarse_facet_name.toLowerCase();
        for (var key in facet_counts) {
            // originally this was meant to collapse "Indian" and "Contemporary Indian", for example, but then when you'd filter on the overarching name, the match would only be exact...this would need further work
            // if (key.toLowerCase().indexOf(coarse_facet_name) != -1) {
            if (key.toLowerCase() == coarse_facet_name) {
                count += facet_counts[key];
            }
        }
        return count;
    }
    
    var compile_filters = function (filter) {
        var compiled = R.filters.filter(function (element) {
            return element.length;
        });
        return compiled.join(' AND ');
    }
    
    var api_call = function (query) {
        if (typeof(query) == 'undefined') {
            query = R.query;
        }
        algoliaHelper.setQueryParameter('filters', compile_filters(R.filters));
        // console.log(compile_filters(R.filters));
        // for simplicity, loading more results requeries with increased page size instead of requesting further pages, in a true production implementation this would probably not be the way to go
        algoliaHelper.setQueryParameter(location_parameter, location_value)
            .setQueryParameter('hitsPerPage', R.pages * R.increment)
            .setQuery(query)
            .search();
    }
    
    // bind UI update to query result
    algoliaHelper.on('result', function (content, state) {
        // console.log(state);
        // console.log(content.facets[0].data);
        // for (var h in content.hits) {
        //     console.log('Hit(' + content.hits[h].objectID + '): ' + content.hits[h].toString());
        // }
        ui_update(content);
        console.log(content);
    });
    
    // UI search bar key input
    $('#search').on('keyup', function () {
        var query = $(this).val().trim();
        // cache the query, also adding spaces won't matter
        if (R.query == query) {
            return;
        } else {
            R.query = query;
        }
        api_call(query);
    });
    
    // UI load more results
    $('#more').on('click', function (ev) {
        R.pages += 1;
        api_call();
    });
    
    // UI filter food type clicks
    $('.filter.food_type li').on('click', function (ev) {
        var active = $(this).hasClass('active');
        $('.food_type li').removeClass('active');
        if (active) {
            var filter = '';
        } else {
            $(this).addClass('active');
            var filter = 'food_type:'+$(this).find('.name').text().toLowerCase();
        }
        R.filters[0] = filter;
        api_call();
    });
    
    // UI filter food type clicks
    $('.filter.rating li').on('click', function (ev) {
        var active = $(this).hasClass('active');
        var stars = $(this).data('stars');
        $('.filter.rating li').removeClass('active');
        if (active) {
            var filter = '';
        } else {
            $(this).addClass('active');
            var filter = 'stars_count>='+stars+' AND stars_count<'+(stars+1);
        }
        R.filters[1] = filter;
        api_call();
    });
    
    // get geolocation data or fall back
    var location_parameter, location_value;
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(function (position) {
        R['position'] = position;
        // position.coords.latitude, position.coords.longitude
        location_parameter = 'aroundLatLng';
        location_value = R.position.coords.latitude+','+R.position.coords.longitude;
        // console.log(location_value);
        api_call();
      });
    } else {
        location_parameter = 'aroundLatLngViaIP';
        location_value = true;
        api_call();
    }
    
    $('#search').focus();
});
