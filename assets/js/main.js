R = {
    query: '',
    filters: ''
};

$(function () {
    console.log('Page loaded');

    var client = algoliasearch('S4LNH5OS8A', '4d0df2379cbd3102de0e8edda8b630d8');
    var index = client.initIndex('dev_restaurants');
    // index.setSettings({attributesForFaceting: ['food_type']});
    var algoliaHelper = algoliasearchHelper(client, 'dev_restaurants', {
        hitsPerPage: 10,
        index: 'dev_restaurants',
        facets: ['food_type']
    });
    
    if ('geolocation' in navigator) {
      /* geolocation is available */
      navigator.geolocation.getCurrentPosition(function (position) {
        R['position'] = position;
        // position.coords.latitude, position.coords.longitude);
        api_call('');
          
      });
    } else {
        
      /* geolocation IS NOT available */
    }
    
    var ui_update = function (content) {
        if (typeof(content) != 'undefined') {
            var results_number = content.nbHits;
            var results_time = content.processingTimeMS * 0.001;
        } else {
            var results_number = 'N/A';
            var results_time = 'N/A';
        }
        var results = `${results_number} results found`;
        var time = `in ${results_time} seconds`;
    
        $('.ui_results_quantity').text(results);
        $('.ui_results_time').text(time);
        
        $('.resto_listings .clone').remove();
        content.hits.forEach(function (hit) {
            var $clone = $('.template').clone().removeClass('template').addClass('clone');
            $clone.find('.reviews').text(hit.reviews_count);
            $clone.find('.rating').text(hit.stars_count);
            $clone.find('.name').text(hit.name);
            $clone.find('.cuisine').text(hit.food_type);
            $clone.find('.location').text(hit.neighborhood);
            $clone.find('.photo').append('<img src="'+hit.image_url+'" />');
            $clone.find('.stars_yellow').css('width', hit.stars_count*20+'%');
            $clone.find('.price').text(hit.price_range);
            $('.resto_listings').append($clone);
            // 'mobile_reserve_url
        });
        
        if (content.facets.length) {
            $('.type li').each(function (index, element) {
                var coarse_facet_name = $(element).find('.name').text();
                var count = coarse_facet_count(content.facets[0].data, coarse_facet_name);
                $(element).find('.count').text(count);
            });
        } else {
            $('.type li').each(function (index, element) {
                $(element).find('.count').text('0');
            });
        }
    }
    
    algoliaHelper.on('result', function (content, state) {
        // TODO error handling
        
        // for (var h in content.hits) {
        //     console.log('Hit(' + content.hits[h].objectID + '): ' + content.hits[h].toString());
        // }
        
        // console.log(content.facets[0].data);
        ui_update(content);
    });
    
    var coarse_facet_count = function (facet_counts, coarse_facet_name) {
        var count = 0;
        coarse_facet_name = coarse_facet_name.toLowerCase();
        for (var key in facet_counts) {
            if (key.toLowerCase().indexOf(coarse_facet_name) >= 0) {
                count += facet_counts[key];
            }
        }
        return count;
    }
    
    $('.type li').on('click', function () {
        if ($(this).not('.active')) {
            $('.type li').removeClass('active');
            $(this).addClass('active');
            R.filters = 'food_type:'+$(this).find('.name').text();
            api_call();
        }
    });
    
    var api_call = function (query) {
        var arg1 = 'aroundLatLng';
        var arg2 = R.position.coords.latitude+','+R.position.coords.longitude;
        arg1 = 'aroundLatLngViaIP';
        arg2 = true;
        if (typeof(query) == 'undefined') {
            query = R.query;
        }
        if (typeof(R.filters) != 'undefined') {
            algoliaHelper.setQueryParameter('filters', R.filters);
        }
        algoliaHelper.setQueryParameter(arg1, arg2)
            .setQuery(query)
            .search();
    }
    
    // ui_update();

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
    
    $('.more').on('click', function (ev) {
        // load more
    });

});
